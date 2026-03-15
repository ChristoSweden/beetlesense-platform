import { Job, Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import { buildParcelPath } from '../lib/storage.js'
import { LantmaterietFetcher } from '../services/opendata/index.js'
import { LidarProcessor } from '../services/lidar/index.js'
import type { BBox, GeoJSONFeature } from '@beetlesense/shared'

export const LIDAR_PROCESSING_QUEUE = 'lidar-processing'

export interface LidarProcessingJobData {
  parcelId: string
  organizationId: string
  /** If true, skip downloading tiles and use existing ones */
  skipDownload?: boolean
}

/**
 * LiDAR Processing Worker
 *
 * Pipeline:
 * 1. Fetch parcel from Supabase (boundary, bbox)
 * 2. Download LiDAR tiles via LantmaterietFetcher (or skip if already cached)
 * 3. Run LidarProcessor to generate CHM, DTM, DSM
 * 4. Store results in parcel_open_data table
 * 5. Report progress through each step
 */
export function createLidarProcessingWorker(): Worker<LidarProcessingJobData> {
  const worker = new Worker<LidarProcessingJobData>(
    LIDAR_PROCESSING_QUEUE,
    async (job: Job<LidarProcessingJobData>) => {
      const log = createJobLogger(job.id!, LIDAR_PROCESSING_QUEUE)
      const supabase = getSupabaseAdmin()
      const { parcelId, organizationId, skipDownload } = job.data

      log.info({ parcelId, skipDownload }, 'Starting LiDAR processing')

      // Step 1: Fetch parcel details
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select('id, boundary, fastighets_id')
        .eq('id', parcelId)
        .single()

      if (parcelError || !parcel) {
        throw new Error(
          `Parcel not found: ${parcelId} — ${parcelError?.message ?? 'no data'}`,
        )
      }

      await job.updateProgress(5)

      // Step 2: Compute bbox from boundary
      const bbox = computeBBoxFromBoundary(parcel.boundary)

      log.info({ parcelId, bbox }, 'Computed bbox from parcel boundary')
      await job.updateProgress(10)

      // Step 3: Download LiDAR tiles
      let lazPaths: string[] = []

      if (skipDownload) {
        log.info('Skipping LiDAR tile download (using cached tiles)')
        // Look up existing tile paths from parcel_open_data
        const { data: existingData } = await supabase
          .from('parcel_open_data')
          .select('metadata')
          .eq('parcel_id', parcelId)
          .eq('source', 'lantmateriet/lidar')
          .maybeSingle()

        if (existingData?.metadata) {
          const meta = existingData.metadata as Record<string, unknown>
          const tileIds = meta.tileIds as string[] | undefined
          if (tileIds) {
            lazPaths = tileIds.map((tileId: string) =>
              buildParcelPath(parcelId, 'lantmateriet/lidar', `${tileId}.laz`),
            )
          }
        }

        if (lazPaths.length === 0) {
          throw new Error(
            'skipDownload was set but no cached LiDAR tiles found',
          )
        }
      } else {
        const lantmateriet = new LantmaterietFetcher()
        const tiles = await lantmateriet.fetchLidarTiles(bbox, parcelId)
        lazPaths = tiles.map((t) => t.storagePath)
      }

      log.info(
        { parcelId, tileCount: lazPaths.length },
        'LiDAR tiles ready for processing',
      )
      await job.updateProgress(30)

      // Step 4: Build parcel boundary as GeoJSON for clipping
      const parcelBoundary = buildBoundaryFeature(parcel.boundary, parcelId)

      // Step 5: Run LiDAR processing
      const processor = new LidarProcessor()
      const outputDir = buildParcelPath(parcelId, 'lidar/products', '')

      // Generate DTM (30-50%)
      log.info('Generating DTM...')
      const dtmOutput = await processor.generateDTM(lazPaths, outputDir)
      await job.updateProgress(50)

      // Generate DSM (50-70%)
      log.info('Generating DSM...')
      const dsmOutput = await processor.generateDSM(lazPaths, outputDir)
      await job.updateProgress(70)

      // Generate CHM (70-90%)
      log.info('Generating CHM...')
      const chmOutput = await processor.generateCHM(
        lazPaths,
        outputDir,
        parcelBoundary,
      )
      await job.updateProgress(90)

      // Step 6: Store results in parcel_open_data
      const products = [
        { source: 'lidar/dtm', output: dtmOutput },
        { source: 'lidar/dsm', output: dsmOutput },
        { source: 'lidar/chm', output: chmOutput },
      ]

      for (const product of products) {
        const { data: existing } = await supabase
          .from('parcel_open_data')
          .select('id')
          .eq('parcel_id', parcelId)
          .eq('source', product.source)
          .maybeSingle()

        const metadata = {
          type: product.source.split('/')[1],
          resolution_m: product.output.resolutionM,
          crs: product.output.crs,
          bbox: product.output.bbox,
          stats: product.output.stats,
          format: 'Cloud Optimized GeoTIFF',
          sourceFiles: lazPaths.length,
        }

        if (existing) {
          await supabase
            .from('parcel_open_data')
            .update({
              storage_path: product.output.cogPath,
              fetched_at: new Date().toISOString(),
              metadata,
              data_version: new Date().toISOString().slice(0, 10),
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('parcel_open_data').insert({
            parcel_id: parcelId,
            source: product.source,
            storage_path: product.output.cogPath,
            metadata,
            data_version: new Date().toISOString().slice(0, 10),
          })
        }
      }

      await job.updateProgress(100)

      const result = {
        parcelId,
        tilesProcessed: lazPaths.length,
        products: {
          dtm: { path: dtmOutput.cogPath, stats: dtmOutput.stats },
          dsm: { path: dsmOutput.cogPath, stats: dsmOutput.stats },
          chm: { path: chmOutput.cogPath, stats: chmOutput.stats },
        },
      }

      log.info(result, 'LiDAR processing completed')
      return result
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // LiDAR processing is CPU/memory intensive
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, LIDAR_PROCESSING_QUEUE)
    log.info(
      { parcelId: job.data.parcelId },
      'LiDAR processing job completed',
    )
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, LIDAR_PROCESSING_QUEUE)
    log.error(
      { parcelId: job.data.parcelId, err },
      'LiDAR processing job failed',
    )
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', LIDAR_PROCESSING_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

/**
 * Compute a bounding box from a PostGIS geometry.
 */
function computeBBoxFromBoundary(boundary: unknown): BBox {
  if (
    boundary &&
    typeof boundary === 'object' &&
    'coordinates' in (boundary as Record<string, unknown>)
  ) {
    const geom = boundary as { coordinates: number[][][][] }
    const allCoords = geom.coordinates.flat(2)
    const xs = allCoords.map((c) => c[0]!)
    const ys = allCoords.map((c) => c[1]!)

    if (xs.length > 0 && ys.length > 0) {
      return {
        west: Math.min(...xs),
        south: Math.min(...ys),
        east: Math.max(...xs),
        north: Math.max(...ys),
      }
    }
  }

  return { west: 434850, south: 6336200, east: 435200, north: 6336600 }
}

/**
 * Build a GeoJSON Feature from the parcel boundary for use in clipping.
 */
function buildBoundaryFeature(
  boundary: unknown,
  parcelId: string,
): GeoJSONFeature {
  if (
    boundary &&
    typeof boundary === 'object' &&
    'type' in (boundary as Record<string, unknown>) &&
    'coordinates' in (boundary as Record<string, unknown>)
  ) {
    return {
      type: 'Feature',
      geometry: boundary as GeoJSONFeature['geometry'],
      properties: { parcelId },
    }
  }

  // Fallback mock boundary
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [434850, 6336200],
          [435200, 6336200],
          [435200, 6336600],
          [434850, 6336600],
          [434850, 6336200],
        ],
      ],
    },
    properties: { parcelId },
  }
}
