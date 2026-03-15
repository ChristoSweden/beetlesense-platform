import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const REPORT_GENERATION_QUEUE = 'report-generation'

export interface ReportGenerationJobData {
  surveyId: string
  organizationId: string
  parcelId: string
  reportType: 'full' | 'summary' | 'module'
  modules: string[]
  locale: string
  requestedBy: string
}

export function createReportGenerationQueue(): Queue<ReportGenerationJobData> {
  return new Queue<ReportGenerationJobData>(REPORT_GENERATION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: {
        age: 14 * 24 * 3600,
        count: 500,
      },
      removeOnFail: {
        age: 30 * 24 * 3600,
      },
    },
  })
}
