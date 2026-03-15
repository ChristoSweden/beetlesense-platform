import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const UPLOAD_VALIDATION_QUEUE = 'upload-validation'

export interface UploadValidationJobData {
  uploadId: string
  surveyId: string
  organizationId: string
  storagePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
}

export function createUploadValidationQueue(): Queue<UploadValidationJobData> {
  return new Queue<UploadValidationJobData>(UPLOAD_VALIDATION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
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
