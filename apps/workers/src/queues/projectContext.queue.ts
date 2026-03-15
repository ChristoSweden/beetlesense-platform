import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'
import type { AnalysisResultSummary, SatelliteObservation } from '../services/knowledgebase/projectContextService.js'

export const PROJECT_CONTEXT_QUEUE = 'project-context'

export type ProjectContextJobData =
  | {
      type: 'analysis_complete'
      userId: string
      organizationId: string
      surveyId: string
      module: string
      results: AnalysisResultSummary
    }
  | {
      type: 'satellite_update'
      userId: string
      organizationId: string
      parcelId: string
      observation: SatelliteObservation
    }

export function createProjectContextQueue(): Queue<ProjectContextJobData> {
  return new Queue<ProjectContextJobData>(PROJECT_CONTEXT_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
      removeOnComplete: {
        age: 3 * 24 * 3600,
        count: 2000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  })
}

/**
 * Add a job to embed analysis results as user-data context.
 */
export async function addAnalysisContextJob(
  queue: Queue<ProjectContextJobData>,
  data: {
    userId: string
    organizationId: string
    surveyId: string
    module: string
    results: AnalysisResultSummary
  },
): Promise<string> {
  const job = await queue.add(
    `analysis-ctx-${data.surveyId}-${data.module}`,
    { type: 'analysis_complete', ...data },
    {
      jobId: `analysis-ctx-${data.surveyId}-${data.module}`,
    },
  )
  return job.id!
}

/**
 * Add a job to embed a satellite observation as user-data context.
 */
export async function addSatelliteContextJob(
  queue: Queue<ProjectContextJobData>,
  data: {
    userId: string
    organizationId: string
    parcelId: string
    observation: SatelliteObservation
  },
): Promise<string> {
  const job = await queue.add(
    `satellite-ctx-${data.parcelId}-${data.observation.observationId}`,
    { type: 'satellite_update', ...data },
  )
  return job.id!
}
