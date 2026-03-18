import type { Job} from 'bullmq';
import { Worker, FlowProducer } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  SURVEY_PROCESSING_QUEUE,
  type SurveyProcessingJobData,
} from '../queues/surveyProcessing.queue.js'
import {
  MODULE_PROCESSING_QUEUE,
  type ModuleProcessingJobData,
} from '../queues/moduleProcessing.queue.js'
import {
  FUSION_QUEUE,
  type FusionJobData,
} from '../queues/fusion.queue.js'
import {
  SENSOR_PROCESSING_QUEUE,
  type SensorProcessingJobData,
  type SensorType,
} from '../queues/sensorProcessing.queue.js'

/**
 * Survey Processing Worker
 *
 * Pipeline:
 * 1. Fetch survey from Supabase
 * 2. Validate all uploads are present
 * 3. Dispatch child jobs for each module (parallel)
 * 4. Wait for all module jobs to complete
 * 5. Trigger fusion job to merge results
 * 6. Update survey status
 * 7. Send notification
 */
export function createSurveyProcessingWorker(): Worker<SurveyProcessingJobData> {
  const worker = new Worker<SurveyProcessingJobData>(
    SURVEY_PROCESSING_QUEUE,
    async (job: Job<SurveyProcessingJobData>) => {
      const log = createJobLogger(job.id!, SURVEY_PROCESSING_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, organizationId, modules } = job.data

      log.info({ surveyId, modules }, 'Starting survey processing')

      // Step 1: Fetch survey from Supabase
      await job.updateProgress(5)
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .eq('organization_id', organizationId)
        .single()

      if (surveyError || !survey) {
        throw new Error(
          `Survey not found: ${surveyId} — ${surveyError?.message ?? 'no data'}`,
        )
      }

      // Step 2: Update status to processing
      await supabase
        .from('surveys')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', surveyId)

      await job.updateProgress(10)

      // Step 3: Verify uploads exist and categorize by sensor type
      const { data: uploads, error: uploadsError } = await supabase
        .from('survey_uploads')
        .select('id, upload_status, upload_type, storage_path')
        .eq('survey_id', surveyId)
        .eq('upload_status', 'uploaded')

      if (uploadsError) {
        throw new Error(`Failed to fetch uploads: ${uploadsError.message}`)
      }

      if (!uploads || uploads.length === 0) {
        throw new Error(
          `No uploaded files found for survey ${surveyId}. Cannot process.`,
        )
      }

      log.info(
        { uploadCount: uploads.length },
        'Verified uploads for processing',
      )
      await job.updateProgress(15)

      // Step 3b: Dispatch sensor-specific processing jobs based on upload types
      const sensorTypeMap: Record<string, SensorType> = {
        drone_multispectral: 'multispectral',
        drone_thermal: 'thermal',
        drone_rgb: 'rgb',
      }

      const sensorGroups: Record<SensorType, string[]> = {
        multispectral: [],
        thermal: [],
        rgb: [],
      }

      for (const upload of uploads) {
        const sensorType = sensorTypeMap[upload.upload_type]
        if (sensorType && upload.storage_path) {
          sensorGroups[sensorType].push(upload.storage_path)
        }
      }

      // Dispatch sensor processing jobs for each sensor type that has uploads
      const sensorJobs: Array<{ name: string; queueName: string; data: SensorProcessingJobData }> = []
      for (const [sensorType, paths] of Object.entries(sensorGroups)) {
        if (paths.length === 0) continue
        sensorJobs.push({
          name: `sensor-${sensorType}-${surveyId}`,
          queueName: SENSOR_PROCESSING_QUEUE,
          data: {
            surveyId,
            parcelId: survey.parcel_id,
            sensorType: sensorType as SensorType,
            inputPaths: paths,
            outputDir: `data/${survey.parcel_id}/sensors/${sensorType}`,
          },
        })
      }

      if (sensorJobs.length > 0) {
        const sensorFlow = new FlowProducer({ connection: createRedisConnection() })
        for (const sj of sensorJobs) {
          await sensorFlow.add({
            name: sj.name,
            queueName: sj.queueName,
            data: sj.data,
          })
        }
        await sensorFlow.close()
        log.info(
          { sensorTypes: sensorJobs.map((s) => s.data.sensorType) },
          'Dispatched sensor-specific processing jobs',
        )
      }

      // Step 4: Create analysis_results rows for each module
      const analysisRows = modules.map((module) => ({
        survey_id: surveyId,
        parcel_id: survey.parcel_id,
        organization_id: organizationId,
        module,
        status: 'queued' as const,
        result_data: {},
      }))

      const { data: analysisResults, error: insertError } = await supabase
        .from('analysis_results')
        .insert(analysisRows)
        .select('id, module')

      if (insertError || !analysisResults) {
        throw new Error(
          `Failed to create analysis result rows: ${insertError?.message}`,
        )
      }

      log.info(
        { resultIds: analysisResults.map((r) => r.id) },
        'Created analysis result rows',
      )
      await job.updateProgress(20)

      // Step 5: Dispatch child jobs for each module using FlowProducer
      const flowProducer = new FlowProducer({
        connection: createRedisConnection(),
      })

      const moduleChildJobs = analysisResults.map((result) => ({
        name: `module-${result.module}-${surveyId}`,
        queueName: MODULE_PROCESSING_QUEUE,
        data: {
          surveyId,
          module: result.module,
          organizationId,
          parcelId: survey.parcel_id,
          analysisResultId: result.id,
        } satisfies ModuleProcessingJobData,
        opts: {
          jobId: `module-${result.module}-${surveyId}`,
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 10000 },
        },
      }))

      // Create a flow: fusion job depends on all module jobs
      const flow = await flowProducer.add({
        name: `fusion-${surveyId}`,
        queueName: FUSION_QUEUE,
        data: {
          surveyId,
          organizationId,
          moduleResults: analysisResults.map((r) => r.id),
        } satisfies FusionJobData,
        opts: {
          jobId: `fusion-${surveyId}`,
          attempts: 2,
          backoff: { type: 'exponential' as const, delay: 5000 },
        },
        children: moduleChildJobs,
      })

      log.info(
        {
          flowJobId: flow.job.id,
          moduleJobCount: moduleChildJobs.length,
        },
        'Dispatched module processing flow',
      )
      await job.updateProgress(30)

      // Step 6: The flow handles waiting for children automatically.
      // We monitor completion by polling analysis_results.
      // In production, the fusion worker updates the survey to 'completed'.
      // Here we just log that we've kicked off the flow.

      log.info(
        { surveyId },
        'Survey processing flow dispatched. Fusion job will finalize.',
      )
      await job.updateProgress(100)

      await flowProducer.close()

      return {
        surveyId,
        modulesDispatched: modules,
        flowJobId: flow.job.id,
        analysisResultIds: analysisResults.map((r) => r.id),
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, SURVEY_PROCESSING_QUEUE)
    log.info({ surveyId: job.data.surveyId }, 'Survey processing completed')
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, SURVEY_PROCESSING_QUEUE)
    log.error(
      { surveyId: job.data.surveyId, err },
      'Survey processing failed',
    )

    // Update survey status to failed
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('surveys')
        .update({
          status: 'failed',
          error_message: err.message,
        })
        .eq('id', job.data.surveyId)
    } catch (updateErr) {
      log.error({ updateErr }, 'Failed to update survey status to failed')
    }
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', SURVEY_PROCESSING_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
