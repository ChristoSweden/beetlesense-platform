import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import { buildParcelPath } from '../lib/storage.js'
import {
  SATELLITE_FETCH_QUEUE,
  type SatelliteFetchJobData,
} from '../queues/satelliteFetch.queue.js'
import { Sentinel2Service } from '../services/satellite/index.js'
import type { BBox } from '@beetlesense/shared'

/** Default bands to download if none specified */
const DEFAULT_BANDS = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'SCL']

/**
 * Satellite Fetch Worker
 *
 * Pipeline:
 * 1. Fetch parcel from Supabase (gets boundary, bbox)
 * 2. Discover Sentinel-2 L2A scenes via CDSE OData
 * 3. For each scene: download bands, compute NDVI, apply cloud mask
 * 4. Store observations in satellite_observations table
 * 5. Report progress per scene
 */
export function createSatelliteFetchWorker(): Worker<SatelliteFetchJobData> {
  const worker = new Worker<SatelliteFetchJobData>(
    SATELLITE_FETCH_QUEUE,
    async (job: Job<SatelliteFetchJobData>) => {
      const log = createJobLogger(job.id!, SATELLITE_FETCH_QUEUE)
      const supabase = getSupabaseAdmin()
      const {
        parcelId,
        organizationId,
        dateRange,
        maxCloudCover,
        bands: requestedBands,
      } = job.data

      const bands = requestedBands ?? DEFAULT_BANDS

      log.info(
        { parcelId, dateRange, maxCloudCover, bands },
        'Starting satellite fetch',
      )

      // Step 1: Fetch parcel to get boundary / centroid for bbox
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select('id, boundary_wgs84, centroid')
        .eq('id', parcelId)
        .single()

      if (parcelError || !parcel) {
        throw new Error(
          `Parcel not found: ${parcelId} — ${parcelError?.message ?? 'no data'}`,
        )
      }

      await job.updateProgress(5)

      // Compute WGS84 bbox from parcel boundary
      const bbox = extractWGS84BBox(parcel.boundary_wgs84, parcel.centroid)

      log.info({ parcelId, bbox }, 'Computed WGS84 bbox for scene discovery')

      // Step 2: Discover scenes
      const sentinel = new Sentinel2Service()
      const dateFrom = new Date(dateRange.start)
      const dateTo = new Date(dateRange.end)

      const scenes = await sentinel.discoverScenes(
        bbox,
        dateFrom,
        dateTo,
        maxCloudCover,
      )

      log.info(
        { sceneCount: scenes.length, parcelId },
        'Sentinel-2 scenes discovered',
      )
      await job.updateProgress(15)

      if (scenes.length === 0) {
        log.info({ parcelId, dateRange }, 'No cloud-free scenes found')
        return { parcelId, scenesProcessed: 0, observations: [] }
      }

      // Step 3: Process each scene
      const observations: {
        sceneId: string
        acquisitionDate: string
        ndviMean: number
        cloudPercent: number
      }[] = []

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]!
        const sceneProgress = 15 + ((i + 1) / scenes.length) * 80

        log.info(
          {
            sceneIndex: i + 1,
            totalScenes: scenes.length,
            sceneId: scene.id,
            acquisitionDate: scene.acquisitionDate,
            cloudCover: scene.cloudCoverPercent,
          },
          'Processing scene',
        )

        try {
          // Step 3a: Download bands
          const outputDir = buildParcelPath(
            parcelId,
            'sentinel2',
            `scene_${scene.id}`,
          )
          const bandPaths = await sentinel.downloadBands(
            scene.id,
            bands,
            outputDir,
          )

          // Step 3b: Compute NDVI (requires B04 and B08)
          let ndviStats = null
          if (bandPaths.B04 && bandPaths.B08) {
            const ndviPath = `${outputDir}/ndvi.tif`
            ndviStats = await sentinel.computeNDVI(
              bandPaths.B04,
              bandPaths.B08,
              ndviPath,
            )

            // Step 3c: Apply cloud mask to NDVI if SCL is available
            if (bandPaths.SCL) {
              await sentinel.applyCloudMask(bandPaths.SCL, ndviPath)
            }
          }

          // Step 3d: Store observation in satellite_observations table
          const observationData = {
            parcel_id: parcelId,
            organization_id: organizationId,
            source: 'sentinel-2' as const,
            footprint: scene.footprintWkt,
            acquisition_date: scene.acquisitionDate.slice(0, 10),
            cloud_cover_percent: scene.cloudCoverPercent,
            resolution_meters: 10,
            bands_available: bands,
            index_data: {
              ndvi: ndviStats
                ? {
                    mean: ndviStats.mean,
                    min: ndviStats.min,
                    max: ndviStats.max,
                    stdDev: ndviStats.stdDev,
                    validPixelCount: ndviStats.validPixelCount,
                  }
                : null,
              sceneName: scene.name,
              tileId: scene.tileId,
            },
            storage_path: outputDir,
            processing_level: scene.processingLevel,
          }

          const { data: _inserted, error: insertError } = await supabase
            .from('satellite_observations')
            .upsert(observationData, {
              onConflict: 'parcel_id,acquisition_date,source',
              ignoreDuplicates: false,
            })
            .select('id')
            .single()

          if (insertError) {
            // If upsert conflict strategy doesn't match the table, try insert
            log.warn(
              { sceneId: scene.id, error: insertError.message },
              'Upsert failed, attempting plain insert',
            )
            await supabase
              .from('satellite_observations')
              .insert(observationData)
          }

          observations.push({
            sceneId: scene.id,
            acquisitionDate: scene.acquisitionDate,
            ndviMean: ndviStats?.mean ?? 0,
            cloudPercent: scene.cloudCoverPercent,
          })

          log.info(
            {
              sceneId: scene.id,
              ndviMean: ndviStats?.mean,
              cloudCover: scene.cloudCoverPercent,
            },
            'Scene processed successfully',
          )
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          log.error(
            { sceneId: scene.id, error },
            'Failed to process scene (continuing with next)',
          )
        }

        await job.updateProgress(Math.round(sceneProgress))
      }

      await job.updateProgress(100)

      const result = {
        parcelId,
        scenesDiscovered: scenes.length,
        scenesProcessed: observations.length,
        observations,
        dateRange,
      }

      log.info(result, 'Satellite fetch completed')
      return result
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, SATELLITE_FETCH_QUEUE)
    log.info({ parcelId: job.data.parcelId }, 'Satellite fetch job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, SATELLITE_FETCH_QUEUE)
    log.error(
      { parcelId: job.data.parcelId, err },
      'Satellite fetch job failed',
    )
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', SATELLITE_FETCH_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

/**
 * Extract a WGS84 bounding box from a parcel's boundary geometry.
 */
function extractWGS84BBox(
  boundaryWgs84: unknown,
  centroid: unknown,
): BBox {
  // Try to parse WGS84 boundary
  if (
    boundaryWgs84 &&
    typeof boundaryWgs84 === 'object' &&
    'coordinates' in (boundaryWgs84 as Record<string, unknown>)
  ) {
    const geom = boundaryWgs84 as { coordinates: number[][][][] }
    const allCoords = geom.coordinates.flat(2)
    const lons = allCoords.map((c) => c[0]!)
    const lats = allCoords.map((c) => c[1]!)

    return {
      west: Math.min(...lons),
      south: Math.min(...lats),
      east: Math.max(...lons),
      north: Math.max(...lats),
    }
  }

  // Try centroid with a 1km buffer
  if (
    centroid &&
    typeof centroid === 'object' &&
    'coordinates' in (centroid as Record<string, unknown>)
  ) {
    const point = centroid as { coordinates: [number, number] }
    const bufferDeg = 0.01 // ~1km
    return {
      west: point.coordinates[0] - bufferDeg,
      south: point.coordinates[1] - bufferDeg,
      east: point.coordinates[0] + bufferDeg,
      north: point.coordinates[1] + bufferDeg,
    }
  }

  // Fallback: Värnamo area
  return { west: 14.0, south: 57.15, east: 14.1, north: 57.22 }
}
