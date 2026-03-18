import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import { config } from '../config.js'
import {
  MODULE_PROCESSING_QUEUE,
  type ModuleProcessingJobData,
} from '../queues/moduleProcessing.queue.js'

interface InferenceResponse {
  status: string
  results: object
  model_version: string
  confidence_score: number
  processing_time_ms: number
}

/**
 * Module Processing Worker
 *
 * Pipeline:
 * 1. Fetch the analysis_result row from Supabase
 * 2. Update analysis_result status to 'processing'
 * 3. Call the inference service for the specific module
 * 4. Store result_summary in the analysis_result row
 * 5. Update status to 'complete' with confidence_score and model_version
 * 6. On error, update status to 'failed' with error in metadata
 */
export function createModuleProcessingWorker(): Worker<ModuleProcessingJobData> {
  const worker = new Worker<ModuleProcessingJobData>(
    MODULE_PROCESSING_QUEUE,
    async (job: Job<ModuleProcessingJobData>) => {
      const log = createJobLogger(job.id!, MODULE_PROCESSING_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, module, organizationId: _organizationId, parcelId: _parcelId, analysisResultId } = job.data

      log.info({ surveyId, module, analysisResultId }, 'Starting module processing')

      // Step 1: Fetch the analysis_result row
      await job.updateProgress(5)
      const { data: analysisResult, error: fetchError } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('id', analysisResultId)
        .single()

      if (fetchError || !analysisResult) {
        throw new Error(
          `Analysis result not found: ${analysisResultId} — ${fetchError?.message ?? 'no data'}`,
        )
      }

      // Step 2: Update status to processing
      await job.updateProgress(10)
      await supabase
        .from('analysis_results')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', analysisResultId)

      log.info({ module, analysisResultId }, 'Status updated to processing')

      // Step 3: Call the inference service
      await job.updateProgress(20)
      const inferenceUrl = `${config.inference.url}/infer/${module}`

      log.info({ inferenceUrl }, 'Calling inference service')

      const response = await fetch(inferenceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: surveyId,
          input_paths: {},
          parameters: {},
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown')
        throw new Error(
          `Inference service returned ${response.status} for module ${module}: ${errorBody}`,
        )
      }

      const inferenceResult = (await response.json()) as InferenceResponse
      await job.updateProgress(80)

      log.info(
        {
          module,
          status: inferenceResult.status,
          confidence: inferenceResult.confidence_score,
          processingTimeMs: inferenceResult.processing_time_ms,
        },
        'Inference service returned results',
      )

      // Step 4 & 5: Store result_summary and update status to complete
      await job.updateProgress(90)
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          status: 'complete',
          result_summary: inferenceResult.results,
          confidence_score: inferenceResult.confidence_score,
          model_version: inferenceResult.model_version,
          processing_time_ms: inferenceResult.processing_time_ms,
          completed_at: new Date().toISOString(),
        })
        .eq('id', analysisResultId)

      if (updateError) {
        throw new Error(
          `Failed to update analysis result: ${updateError.message}`,
        )
      }

      await job.updateProgress(100)
      log.info(
        { analysisResultId, module, confidence: inferenceResult.confidence_score },
        'Module processing complete',
      )

      return {
        analysisResultId,
        module,
        confidence_score: inferenceResult.confidence_score,
        model_version: inferenceResult.model_version,
        processing_time_ms: inferenceResult.processing_time_ms,
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 10,
      limiter: {
        max: 20,
        duration: 60000, // Max 20 jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, MODULE_PROCESSING_QUEUE)
    log.info(
      { module: job.data.module, surveyId: job.data.surveyId },
      'Module processing completed',
    )
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, MODULE_PROCESSING_QUEUE)
    log.error(
      { module: job.data.module, surveyId: job.data.surveyId, err },
      'Module processing failed',
    )

    // Update analysis_result status to failed with error in metadata
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('analysis_results')
        .update({
          status: 'failed',
          metadata: {
            error: err.message,
            failed_at: new Date().toISOString(),
            attempt: job.attemptsMade,
          },
        })
        .eq('id', job.data.analysisResultId)
    } catch (updateErr) {
      log.error({ updateErr }, 'Failed to update analysis result status to failed')
    }
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', MODULE_PROCESSING_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
