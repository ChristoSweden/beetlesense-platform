import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const LIDAR_PROCESSING_QUEUE = 'lidar-processing'

export interface LidarProcessingJobData {
  parcelId: string
  organizationId: string
  /** If true, skip downloading tiles and use existing cached ones */
  skipDownload?: boolean
}

export function createLidarProcessingQueue(): Queue<LidarProcessingJobData> {
  return new Queue<LidarProcessingJobData>(LIDAR_PROCESSING_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30s initial backoff (LiDAR jobs are heavy)
      },
      removeOnComplete: {
        age: 7 * 24 * 3600,
        count: 200,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  })
}
