import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  SENSOR_PROCESSING_QUEUE,
  type SensorProcessingJobData,
} from '../queues/sensorProcessing.queue.js'
import { MultispectralProcessor } from '../services/sensors/multispectralProcessor.js'
import { ThermalProcessor } from '../services/sensors/thermalProcessor.js'
import { RGBProcessor } from '../services/sensors/rgbProcessor.js'

/**
 * Sensor Processing Worker
 *
 * Routes drone sensor data to the appropriate processor:
 * - multispectral → vegetation indices (NDVI, NDRE, GNDVI, CRI, MCARI, EVI)
 * - thermal → temperature map, anomaly detection, canopy-soil diff
 * - rgb → orthomosaic, ExG index, texture analysis
 *
 * Results are stored in S3 and registered in the sensor_products table.
 */
export function createSensorProcessingWorker(): Worker<SensorProcessingJobData> {
  const multispectral = new MultispectralProcessor()
  const thermal = new ThermalProcessor()
  const rgb = new RGBProcessor()

  const worker = new Worker<SensorProcessingJobData>(
    SENSOR_PROCESSING_QUEUE,
    async (job: Job<SensorProcessingJobData>) => {
      const log = createJobLogger(job.id!, SENSOR_PROCESSING_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, parcelId, sensorType, inputPaths, outputDir, parcelBoundaryWkt } = job.data

      log.info({ surveyId, parcelId, sensorType, fileCount: inputPaths.length }, 'Starting sensor processing')

      await job.updateProgress(5)

      let products: Record<string, string> = {}
      let metadata: Record<string, unknown> = {}

      switch (sensorType) {
        case 'multispectral': {
          const result = await multispectral.processIndices(inputPaths, outputDir, parcelBoundaryWkt)
          products = result.indexPaths
          metadata = {
            bandCount: result.bandCount,
            resolutionM: result.resolutionM,
            crs: result.crs,
            stats: result.stats,
            indicesComputed: Object.keys(result.indexPaths),
          }
          break
        }

        case 'thermal': {
          // Check if CHM exists for this parcel (for canopy-soil separation)
          const { data: chmData } = await supabase
            .from('parcel_open_data')
            .select('storage_path')
            .eq('parcel_id', parcelId)
            .eq('source', 'lidar/chm')
            .maybeSingle()

          const result = await thermal.processTemperature(
            inputPaths,
            outputDir,
            parcelBoundaryWkt,
            chmData?.storage_path ?? undefined,
          )
          products = {
            temperature: result.temperaturePath,
            anomaly: result.anomalyPath,
            ...(result.canopySoilDiffPath ? { canopy_soil_diff: result.canopySoilDiffPath } : {}),
          }
          metadata = {
            resolutionM: result.resolutionM,
            crs: result.crs,
            stats: result.stats,
          }
          break
        }

        case 'rgb': {
          const result = await rgb.processRGB(inputPaths, outputDir, parcelBoundaryWkt)
          products = {
            orthomosaic: result.orthomosaicPath,
            exg: result.exgPath,
            texture: result.texturePath,
          }
          metadata = {
            resolutionM: result.resolutionM,
            crs: result.crs,
            bbox: result.bbox,
          }
          break
        }
      }

      await job.updateProgress(80)

      // Store each product in the sensor_products table
      for (const [productName, storagePath] of Object.entries(products)) {
        await supabase.from('sensor_products').upsert({
          survey_id: surveyId,
          parcel_id: parcelId,
          sensor_type: sensorType,
          product_name: productName,
          storage_path: storagePath,
          metadata,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'survey_id,sensor_type,product_name',
        })
      }

      await job.updateProgress(95)

      // ─── Notify the survey requester ───
      try {
        const { data: survey } = await supabase
          .from('surveys')
          .select('requested_by')
          .eq('id', surveyId)
          .single()

        if (survey?.requested_by) {
          await supabase.from('notifications').insert({
            user_id: survey.requested_by,
            category: 'surveys',
            title: 'Sensorbearbetning klar',
            message: `${sensorType} bearbetning slutförd för undersökning`,
            icon: 'Cpu',
            metadata: {
              subtype: 'sensor_complete',
              surveyId,
              sensorType,
              productCount: Object.keys(products).length,
            },
            is_read: false,
            is_dismissed: false,
            created_at: new Date().toISOString(),
          })
        }
      } catch (notifErr) {
        // Non-critical — log but don't fail the job
        log.warn({ err: notifErr }, 'Failed to send sensor processing notification')
      }

      await job.updateProgress(100)
      log.info(
        { sensorType, productsCreated: Object.keys(products).length },
        'Sensor processing complete',
      )

      return { sensorType, products, metadata }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3, // Limited — GDAL is CPU-intensive
      limiter: { max: 10, duration: 60000 },
    },
  )

  worker.on('failed', (job, err) => {
    if (!job) return
    createJobLogger(job.id!, SENSOR_PROCESSING_QUEUE).error(
      { sensorType: job.data.sensorType, surveyId: job.data.surveyId, err },
      'Sensor processing failed',
    )
  })

  return worker
}
