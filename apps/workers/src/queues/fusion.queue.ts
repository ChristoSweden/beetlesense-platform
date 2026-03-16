import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const FUSION_QUEUE = 'fusion'

export interface FusionJobData {
  surveyId: string
  organizationId: string
  moduleResults: string[] // analysis_result IDs
}

export function createFusionQueue(): Queue<FusionJobData> {
  return new Queue<FusionJobData>(FUSION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 500,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  })
}
