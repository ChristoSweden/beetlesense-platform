import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  PHOTOGRAMMETRY_QUEUE,
  type PhotogrammetryJobData,
} from '../queues/photogrammetry.queue.js'
import { processImages } from '../services/photogrammetry/pix4dProcessor.js'

/**
 * Fotogrammetri-worker (Pix4Dengine).
 *
 * Tar emot drönarbilder från kön och bearbetar dem till:
 * - Ortomosaik (georefererad sammansatt bild)
 * - DSM (Digital Surface Model)
 * - DTM (Digital Terrain Model)
 * - Punktmoln (LAZ-format)
 * - Kvalitetsrapport (PDF)
 *
 * Resultaten sparas i S3 och registreras i sensor_products.
 * Nedströms sensorbearbetning (NDVI, etc.) triggras automatiskt.
 */
export function createPhotogrammetryWorker(): Worker<PhotogrammetryJobData> {
  const worker = new Worker<PhotogrammetryJobData>(
    PHOTOGRAMMETRY_QUEUE,
    async (job: Job<PhotogrammetryJobData>) => {
      const log = createJobLogger(job.id!, PHOTOGRAMMETRY_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, parcelId, imagePaths, pipeline, gsd, outputCrs, qualityLevel, calibrationPanel } = job.data

      log.info(
        { surveyId, parcelId, imageCount: imagePaths.length, pipeline: pipeline ?? 'full' },
        'Fotogrammetri-jobb startar',
      )

      // Uppdatera undersökningsstatus
      await supabase
        .from('surveys')
        .update({ processing_status: 'photogrammetry_running' })
        .eq('id', surveyId)

      try {
        const result = await processImages(
          surveyId,
          parcelId,
          imagePaths,
          {
            pipeline: pipeline ?? 'full',
            gsd,
            outputCrs: outputCrs ?? 'EPSG:3006',
            qualityLevel: qualityLevel ?? 'high',
            calibrationPanel,
          },
          // Framstegsrapportering via BullMQ
          async (percent: number) => {
            await job.updateProgress(percent)
          },
        )

        // Uppdatera undersökningsstatus
        await supabase
          .from('surveys')
          .update({ processing_status: 'photogrammetry_complete' })
          .eq('id', surveyId)

        // Skicka notifikation om avslutad bearbetning
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
              title: 'Fotogrammetri-bearbetning klar',
              message: `Ortomosaik och ${Object.keys(result.products).length - 1} ytterligare produkter är redo`,
              icon: 'Map',
              metadata: {
                subtype: 'photogrammetry_complete',
                surveyId,
                parcelId,
                pipeline: pipeline ?? 'full',
                productCount: Object.keys(result.products).length,
                gsdAchieved: result.qualityReport?.gsd_achieved_cm,
                processingTimeS: result.processingTimeS,
              },
              is_read: false,
              is_dismissed: false,
              created_at: new Date().toISOString(),
            })
          }
        } catch (notifErr) {
          // Notifikationsfel ska inte stoppa jobbet
          log.warn({ err: notifErr }, 'Kunde inte skicka fotogrammetri-notifikation')
        }

        log.info(
          {
            surveyId,
            parcelId,
            projectId: result.projectId,
            productCount: Object.keys(result.products).length,
            processingTimeS: result.processingTimeS,
          },
          'Fotogrammetri-jobb slutfört',
        )

        return result
      } catch (err) {
        // Uppdatera status vid fel
        await supabase
          .from('surveys')
          .update({ processing_status: 'photogrammetry_failed' })
          .eq('id', surveyId)

        throw err
      }
    },
    {
      connection: createRedisConnection(),
      // Låg concurrency — fotogrammetri är extremt resurskrävande
      concurrency: 1,
      limiter: { max: 2, duration: 60000 },
    },
  )

  worker.on('failed', (job, err) => {
    if (!job) return
    createJobLogger(job.id!, PHOTOGRAMMETRY_QUEUE).error(
      { surveyId: job.data.surveyId, parcelId: job.data.parcelId, err },
      'Fotogrammetri-jobb misslyckades',
    )
  })

  return worker
}
