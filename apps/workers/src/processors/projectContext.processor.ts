/**
 * BullMQ processor for project context embedding jobs.
 *
 * Triggered when analysis completes or satellite observations update.
 * Generates natural-language summaries and stores as user_data_embeddings
 * so the companion can reference project-specific data.
 */

import type { Job} from 'bullmq';
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import {
  PROJECT_CONTEXT_QUEUE,
  type ProjectContextJobData,
} from '../queues/projectContext.queue.js'
import {
  ProjectContextService,
  type AnalysisResultSummary,
  type SatelliteObservation,
} from '../services/knowledgebase/projectContextService.js'

export function createProjectContextWorker(): Worker<ProjectContextJobData> {
  const contextService = new ProjectContextService()

  const worker = new Worker<ProjectContextJobData>(
    PROJECT_CONTEXT_QUEUE,
    async (job: Job<ProjectContextJobData>) => {
      const log = createJobLogger(job.id!, PROJECT_CONTEXT_QUEUE)
      const { type } = job.data

      switch (type) {
        case 'analysis_complete': {
          const {
            userId,
            organizationId,
            surveyId,
            module,
            results,
          } = job.data as {
            type: 'analysis_complete'
            userId: string
            organizationId: string
            surveyId: string
            module: string
            results: AnalysisResultSummary
          }

          log.info(
            { userId, surveyId, module },
            'Processing analysis context embedding',
          )

          await contextService.onAnalysisComplete(
            userId,
            organizationId,
            surveyId,
            module,
            results,
          )

          await job.updateProgress(100)

          log.info(
            { surveyId, module },
            'Analysis context embedding stored',
          )

          return { surveyId, module, status: 'embedded' }
        }

        case 'satellite_update': {
          const {
            userId,
            organizationId,
            parcelId,
            observation,
          } = job.data as {
            type: 'satellite_update'
            userId: string
            organizationId: string
            parcelId: string
            observation: SatelliteObservation
          }

          log.info(
            { userId, parcelId, observationId: observation.observationId },
            'Processing satellite context embedding',
          )

          await contextService.onSatelliteUpdate(
            userId,
            organizationId,
            parcelId,
            observation,
          )

          await job.updateProgress(100)

          log.info(
            { parcelId, observationId: observation.observationId },
            'Satellite context embedding stored',
          )

          return {
            parcelId,
            observationId: observation.observationId,
            status: 'embedded',
          }
        }

        default:
          throw new Error(`Unknown project context job type: ${type}`)
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
      limiter: {
        max: 20,
        duration: 60_000,
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, PROJECT_CONTEXT_QUEUE)
    log.info({ type: job.data.type }, 'Project context job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, PROJECT_CONTEXT_QUEUE)
    log.error({ type: job.data.type, err }, 'Project context job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', PROJECT_CONTEXT_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
