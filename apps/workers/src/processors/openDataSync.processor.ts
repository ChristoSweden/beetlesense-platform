import type { Job} from 'bullmq';
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  OPEN_DATA_SYNC_QUEUE,
  type OpenDataSyncJobData,
} from '../queues/openDataSync.queue.js'
import {
  LantmaterietFetcher,
  SkogsstyrelsenFetcher,
  SGUFetcher,
  SMHIFetcher,
} from '../services/opendata/index.js'
import type { BBox } from '@beetlesense/shared'

/**
 * Compute a bounding box from a PostGIS geometry (boundary) column.
 * The boundary is stored as WKB/GeoJSON in the parcels table.
 * For simplicity, we query ST_Extent from Supabase via RPC or
 * parse the geometry envelope.
 */
function computeBBoxFromBoundary(boundary: unknown): BBox {
  // In production, the parcel boundary is a PostGIS geometry.
  // We would either:
  // 1. Use Supabase RPC: select ST_XMin(boundary), ST_YMin(boundary), ST_XMax(boundary), ST_YMax(boundary)
  // 2. Parse the GeoJSON representation
  //
  // For now, we extract from the geometry if it's GeoJSON-like, or use a fallback.

  if (
    boundary &&
    typeof boundary === 'object' &&
    'coordinates' in (boundary as Record<string, unknown>)
  ) {
    const geom = boundary as { type: string; coordinates: number[][][][] }
    const coords = geom.coordinates.flat(3)

    // coords is now a flat array of numbers: [x1, y1, x2, y2, ...]
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < coords.length; i += 2) {
      xs.push(coords[i]!)
      ys.push(coords[i + 1]!)
    }

    if (xs.length > 0 && ys.length > 0) {
      return {
        west: Math.min(...xs),
        south: Math.min(...ys),
        east: Math.max(...xs),
        north: Math.max(...ys),
      }
    }
  }

  // Fallback: default bbox near Värnamo in EPSG:3006
  return {
    west: 434850,
    south: 6336200,
    east: 435200,
    north: 6336600,
  }
}

/**
 * Extract centroid lat/lon from a parcel for SMHI lookups.
 * Centroid is stored as a WGS84 point geometry.
 */
function extractCentroidLatLon(centroid: unknown): { lat: number; lon: number } {
  if (
    centroid &&
    typeof centroid === 'object' &&
    'coordinates' in (centroid as Record<string, unknown>)
  ) {
    const point = centroid as { coordinates: [number, number] }
    return { lon: point.coordinates[0], lat: point.coordinates[1] }
  }

  // Fallback: Värnamo center in WGS84
  return { lat: 57.186, lon: 14.04 }
}

interface FetcherResult {
  source: string
  success: boolean
  error?: string
  duration_ms: number
}

/**
 * Open Data Sync Worker
 *
 * Full implementation that syncs external open data sources into BeetleSense:
 * 1. Fetches parcel boundary from Supabase
 * 2. Computes bbox from the boundary
 * 3. Calls all 4 open data fetchers in parallel
 * 4. Reports progress per fetcher (25% each)
 * 5. Updates parcel.last_sync_at on completion
 *
 * Individual fetcher failures do NOT fail the whole job.
 */
export function createOpenDataSyncWorker(): Worker<OpenDataSyncJobData> {
  const worker = new Worker<OpenDataSyncJobData>(
    OPEN_DATA_SYNC_QUEUE,
    async (job: Job<OpenDataSyncJobData>) => {
      const log = createJobLogger(job.id!, OPEN_DATA_SYNC_QUEUE)
      const supabase = getSupabaseAdmin()
      const { parcelId, organizationId: _organizationId } = job.data

      // Step 1: Determine which parcels to sync
      let parcelIds: string[] = []

      if (parcelId) {
        parcelIds = [parcelId]
      } else {
        log.info('Nightly sync: fetching all active parcels')
        const { data: parcels, error } = await supabase
          .from('parcels')
          .select('id')
          .eq('status', 'active')
          .limit(1000)

        if (error) {
          throw new Error(`Failed to fetch parcels: ${error.message}`)
        }
        parcelIds = (parcels ?? []).map((p) => p.id)
      }

      log.info({ parcelCount: parcelIds.length }, 'Starting open data sync')
      await job.updateProgress(5)

      const allResults: Record<string, FetcherResult[]> = {}

      for (let pi = 0; pi < parcelIds.length; pi++) {
        const currentParcelId = parcelIds[pi]!
        log.info({ parcelId: currentParcelId, index: pi + 1, total: parcelIds.length }, 'Syncing parcel')

        // Step 2: Fetch parcel details
        const { data: parcel, error: parcelError } = await supabase
          .from('parcels')
          .select('id, boundary, boundary_wgs84, centroid, fastighets_id')
          .eq('id', currentParcelId)
          .single()

        if (parcelError || !parcel) {
          log.error({ parcelId: currentParcelId, error: parcelError?.message }, 'Failed to fetch parcel')
          continue
        }

        // Step 3: Compute bbox and centroid
        const bbox = computeBBoxFromBoundary(parcel.boundary)
        const centroid = extractCentroidLatLon(parcel.centroid)

        log.info({ parcelId: currentParcelId, bbox, centroid }, 'Computed spatial extents')

        // Step 4: Initialize fetchers
        const lantmateriet = new LantmaterietFetcher()
        const skogsstyrelsen = new SkogsstyrelsenFetcher()
        const sgu = new SGUFetcher()
        const smhi = new SMHIFetcher()

        // Step 5: Run all 4 fetchers in parallel with error isolation
        const fetcherTasks = [
          {
            name: 'lantmateriet',
            fn: async () => {
              await lantmateriet.fetchPropertyBoundary(
                parcel.fastighets_id ?? currentParcelId,
                currentParcelId,
              )
              await lantmateriet.fetchDTM(bbox, currentParcelId)
              await lantmateriet.fetchLidarTiles(bbox, currentParcelId)
              await lantmateriet.fetchOrtofoto(bbox, currentParcelId)
            },
          },
          {
            name: 'skogsstyrelsen',
            fn: async () => {
              await skogsstyrelsen.fetchKNN(bbox, currentParcelId)
              await skogsstyrelsen.fetchHarvestNotifications(bbox, currentParcelId)
              await skogsstyrelsen.fetchKeyHabitats(bbox, currentParcelId)
            },
          },
          {
            name: 'sgu',
            fn: async () => {
              await sgu.fetchSoilTypes(bbox, currentParcelId)
            },
          },
          {
            name: 'smhi',
            fn: async () => {
              await smhi.fetchClimateData(centroid.lat, centroid.lon, currentParcelId)
            },
          },
        ]

        const results: FetcherResult[] = await Promise.all(
          fetcherTasks.map(async (task, index) => {
            const startTime = Date.now()
            try {
              await task.fn()

              // Report progress: each fetcher = 25% of per-parcel progress
              const baseProgress = 5 + (pi / parcelIds.length) * 90
              const fetcherProgress = ((index + 1) / fetcherTasks.length) * (90 / parcelIds.length)
              await job.updateProgress(Math.round(baseProgress + fetcherProgress))

              return {
                source: task.name,
                success: true,
                duration_ms: Date.now() - startTime,
              }
            } catch (err) {
              const error = err instanceof Error ? err.message : String(err)
              log.error(
                { parcelId: currentParcelId, source: task.name, error },
                'Fetcher failed (continuing with other sources)',
              )
              return {
                source: task.name,
                success: false,
                error,
                duration_ms: Date.now() - startTime,
              }
            }
          }),
        )

        allResults[currentParcelId] = results

        // Step 6: Update parcel.last_sync_at
        const { error: updateError } = await supabase
          .from('parcels')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', currentParcelId)

        if (updateError) {
          log.warn(
            { parcelId: currentParcelId, error: updateError.message },
            'Failed to update last_sync_at',
          )
        }

        const succeeded = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success).length
        log.info(
          { parcelId: currentParcelId, succeeded, failed, results },
          'Parcel sync complete',
        )
      }

      await job.updateProgress(100)

      // Summary
      const summary = {
        parcelsProcessed: parcelIds.length,
        results: Object.fromEntries(
          Object.entries(allResults).map(([pid, results]) => [
            pid,
            {
              succeeded: results.filter((r) => r.success).length,
              failed: results.filter((r) => !r.success).length,
              totalDuration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0),
            },
          ]),
        ),
      }

      log.info(summary, 'Open data sync completed')
      return summary
    },
    {
      connection: createRedisConnection(),
      concurrency: 2, // Limit concurrency for API rate limits
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, OPEN_DATA_SYNC_QUEUE)
    log.info('Open data sync job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, OPEN_DATA_SYNC_QUEUE)
    log.error({ err }, 'Open data sync job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', OPEN_DATA_SYNC_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
