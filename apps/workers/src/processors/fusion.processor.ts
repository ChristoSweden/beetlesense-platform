import type { Job } from 'bullmq'
import { Worker, Queue } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  FUSION_QUEUE,
  type FusionJobData,
} from '../queues/fusion.queue.js'
import {
  REPORT_GENERATION_QUEUE,
  type ReportGenerationJobData,
} from '../queues/reportGeneration.queue.js'

/**
 * Fusion Worker
 *
 * Pipeline:
 * 1. Fetch all analysis_results for the survey
 * 2. Validate all module results are complete
 * 3. Compile fused results into fusion_results table
 * 4. Update survey status to 'complete'
 * 5. Trigger report generation by adding a job to the report-generation queue
 */
export function createFusionWorker(): Worker<FusionJobData> {
  const worker = new Worker<FusionJobData>(
    FUSION_QUEUE,
    async (job: Job<FusionJobData>) => {
      const log = createJobLogger(job.id!, FUSION_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, organizationId, moduleResults } = job.data

      log.info({ surveyId, moduleResultCount: moduleResults.length }, 'Starting fusion processing')

      // Step 1: Fetch all analysis_results for the survey
      await job.updateProgress(10)
      const { data: analysisResults, error: fetchError } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('survey_id', surveyId)
        .in('id', moduleResults)

      if (fetchError || !analysisResults) {
        throw new Error(
          `Failed to fetch analysis results for survey ${surveyId}: ${fetchError?.message ?? 'no data'}`,
        )
      }

      log.info(
        { resultCount: analysisResults.length, expected: moduleResults.length },
        'Fetched analysis results',
      )

      // Step 2: Validate all module results are complete
      await job.updateProgress(20)
      const incompleteModules = analysisResults.filter((r) => r.status !== 'complete')
      if (incompleteModules.length > 0) {
        const moduleNames = incompleteModules.map(
          (r) => `${r.module}(${r.status})`,
        )
        throw new Error(
          `Not all modules complete for survey ${surveyId}: ${moduleNames.join(', ')}`,
        )
      }

      // Step 3: Compile fused results
      await job.updateProgress(40)
      const fusedData = compileFusionResults(analysisResults)

      log.info(
        { moduleCount: analysisResults.length, fusionKeys: Object.keys(fusedData.summary) },
        'Fusion results compiled',
      )

      // Step 4: Insert into fusion_results table
      await job.updateProgress(60)
      const { data: fusionResult, error: insertError } = await supabase
        .from('fusion_results')
        .insert({
          survey_id: surveyId,
          organization_id: organizationId,
          analysis_result_ids: moduleResults,
          fused_data: fusedData.summary,
          overall_confidence: fusedData.overallConfidence,
          module_count: analysisResults.length,
          metadata: {
            modules: analysisResults.map((r) => r.module),
            processing_times: analysisResults.reduce(
              (acc: Record<string, number>, r) => {
                acc[r.module] = r.processing_time_ms ?? 0
                return acc
              },
              {},
            ),
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError || !fusionResult) {
        throw new Error(
          `Failed to insert fusion result: ${insertError?.message ?? 'no data'}`,
        )
      }

      log.info({ fusionResultId: fusionResult.id }, 'Fusion result stored')

      // Step 5: Update survey status to complete
      await job.updateProgress(75)
      const { error: surveyUpdateError } = await supabase
        .from('surveys')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
          fusion_result_id: fusionResult.id,
        })
        .eq('id', surveyId)

      if (surveyUpdateError) {
        log.warn({ surveyUpdateError }, 'Failed to update survey status, continuing')
      }

      // Step 6: Fetch survey to get parcel_id and modules for report generation
      await job.updateProgress(85)
      const { data: survey } = await supabase
        .from('surveys')
        .select('parcel_id, modules, created_by')
        .eq('id', surveyId)
        .single()

      // Step 7: Trigger report generation
      await job.updateProgress(90)
      const reportQueue = new Queue<ReportGenerationJobData>(REPORT_GENERATION_QUEUE, {
        connection: getRedisConnection(),
      })

      await reportQueue.add(
        `report-${surveyId}`,
        {
          surveyId,
          organizationId,
          parcelId: survey?.parcel_id ?? '',
          reportType: 'full',
          modules: analysisResults.map((r) => r.module),
          locale: 'sv',
          requestedBy: survey?.created_by ?? 'system',
        },
        {
          jobId: `report-${surveyId}`,
        },
      )

      await reportQueue.close()

      log.info({ surveyId }, 'Report generation job dispatched')

      await job.updateProgress(100)
      log.info(
        { surveyId, fusionResultId: fusionResult.id },
        'Fusion processing complete',
      )

      return {
        surveyId,
        fusionResultId: fusionResult.id,
        overallConfidence: fusedData.overallConfidence,
        moduleCount: analysisResults.length,
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, FUSION_QUEUE)
    log.info({ surveyId: job.data.surveyId }, 'Fusion processing completed')
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, FUSION_QUEUE)
    log.error(
      { surveyId: job.data.surveyId, err },
      'Fusion processing failed',
    )

    // Update survey status to failed
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('surveys')
        .update({
          status: 'failed',
          error_message: `Fusion failed: ${err.message}`,
        })
        .eq('id', job.data.surveyId)
    } catch (updateErr) {
      log.error({ updateErr }, 'Failed to update survey status to failed')
    }
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', FUSION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

// ─── Helpers ───

interface FusionOutput {
  summary: Record<string, unknown>
  overallConfidence: number
}

/**
 * Compile individual module results into a fused summary.
 * Averages confidence scores and merges result data by module.
 */
function compileFusionResults(
  analysisResults: Record<string, unknown>[],
): FusionOutput {
  const summary: Record<string, unknown> = {}

  let totalConfidence = 0
  let confidenceCount = 0

  for (const result of analysisResults) {
    const moduleName = result.module as string
    const resultSummary = result.result_summary as Record<string, unknown> | null
    const confidence = result.confidence_score as number | null

    summary[moduleName] = {
      result_summary: resultSummary ?? {},
      confidence_score: confidence ?? 0,
      model_version: result.model_version ?? 'unknown',
    }

    if (confidence != null) {
      totalConfidence += confidence
      confidenceCount++
    }
  }

  const overallConfidence =
    confidenceCount > 0 ? totalConfidence / confidenceCount : 0

  return { summary, overallConfidence }
}
