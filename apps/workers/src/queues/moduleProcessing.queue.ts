import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const MODULE_PROCESSING_QUEUE = 'module-processing'

export interface ModuleProcessingJobData {
  surveyId: string
  module: string // e.g. 'tree_count', 'species_id', 'beetle_detection', 'boar_damage', 'animal_inventory'
  organizationId: string
  parcelId: string
  analysisResultId: string
}

export function createModuleProcessingQueue(): Queue<ModuleProcessingJobData> {
  return new Queue<ModuleProcessingJobData>(MODULE_PROCESSING_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
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
