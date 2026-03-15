import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const SURVEY_PROCESSING_QUEUE = 'survey-processing'

export interface SurveyProcessingJobData {
  surveyId: string
  organizationId: string
  modules: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface ModuleProcessingJobData {
  surveyId: string
  module: string
  organizationId: string
  parcelId: string
}

export interface FusionJobData {
  surveyId: string
  organizationId: string
  moduleResults: string[] // analysis_result IDs
}

const priorityMap: Record<string, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
}

export function createSurveyProcessingQueue(): Queue<SurveyProcessingJobData> {
  return new Queue<SurveyProcessingJobData>(SURVEY_PROCESSING_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 1000,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  })
}

/**
 * Add a survey processing job with priority based on survey priority.
 */
export async function addSurveyProcessingJob(
  queue: Queue<SurveyProcessingJobData>,
  data: SurveyProcessingJobData,
): Promise<string> {
  const job = await queue.add(`process-survey-${data.surveyId}`, data, {
    priority: priorityMap[data.priority] ?? 3,
    jobId: `survey-${data.surveyId}`,
  })
  return job.id!
}
