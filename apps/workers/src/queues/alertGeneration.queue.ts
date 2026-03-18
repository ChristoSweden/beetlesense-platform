import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const ALERT_GENERATION_QUEUE = 'alert-generation'

export interface AlertGenerationJobData {
  /** Force alert generation even if already ran today */
  force?: boolean
  /** Optionally restrict to a single user */
  userId?: string
  /** Optionally restrict to a single organization */
  organizationId?: string
}

export function createAlertGenerationQueue(): Queue<AlertGenerationJobData> {
  return new Queue<AlertGenerationJobData>(ALERT_GENERATION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
      removeOnComplete: {
        age: 30 * 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 30 * 24 * 3600,
      },
    },
  })
}

/**
 * Schedule daily alert generation.
 * Runs at 06:00 UTC every day.
 */
export async function scheduleDailyAlertGeneration(
  queue: Queue<AlertGenerationJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'daily-alert-generation',
    {
      pattern: '0 6 * * *', // 06:00 UTC
    },
    {
      name: 'daily-alerts',
      data: {
        force: false,
      },
    },
  )
}

/**
 * Add an ad-hoc alert generation job.
 */
export async function addAlertGenerationJob(
  queue: Queue<AlertGenerationJobData>,
  data: AlertGenerationJobData,
): Promise<string> {
  const job = await queue.add('alert-generation', data)
  return job.id!
}
