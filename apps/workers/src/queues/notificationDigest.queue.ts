import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const NOTIFICATION_DIGEST_QUEUE = 'notification-digest'

export interface NotificationDigestJobData {
  /** Digest type: daily or weekly */
  digestType: 'daily' | 'weekly'
  /** Optionally restrict to a single user */
  userId?: string
  /** Force even if no unread notifications */
  force?: boolean
}

export function createNotificationDigestQueue(): Queue<NotificationDigestJobData> {
  return new Queue<NotificationDigestJobData>(NOTIFICATION_DIGEST_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600,
        count: 50,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  })
}

/**
 * Schedule daily digest at 07:00 UTC.
 */
export async function scheduleDailyDigest(
  queue: Queue<NotificationDigestJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'daily-notification-digest',
    {
      pattern: '0 7 * * *', // 07:00 UTC
    },
    {
      name: 'daily-digest',
      data: {
        digestType: 'daily',
        force: false,
      },
    },
  )
}

/**
 * Schedule weekly digest at 08:00 UTC on Mondays.
 */
export async function scheduleWeeklyDigest(
  queue: Queue<NotificationDigestJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'weekly-notification-digest',
    {
      pattern: '0 8 * * 1', // 08:00 UTC, Monday
    },
    {
      name: 'weekly-digest',
      data: {
        digestType: 'weekly',
        force: false,
      },
    },
  )
}

/**
 * Add an ad-hoc digest job.
 */
export async function addNotificationDigestJob(
  queue: Queue<NotificationDigestJobData>,
  data: NotificationDigestJobData,
): Promise<string> {
  const job = await queue.add('notification-digest', data)
  return job.id!
}
