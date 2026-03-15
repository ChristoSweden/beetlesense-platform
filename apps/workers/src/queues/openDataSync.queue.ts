import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const OPEN_DATA_SYNC_QUEUE = 'open-data-sync'

export interface OpenDataSyncJobData {
  /** Optional: sync a specific parcel. If omitted, sync all active parcels. */
  parcelId?: string
  organizationId?: string
  sources?: ('skogsstyrelsen' | 'lantmateriet' | 'sentinel-hub')[]
}

export function createOpenDataSyncQueue(): Queue<OpenDataSyncJobData> {
  return new Queue<OpenDataSyncJobData>(OPEN_DATA_SYNC_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: {
        age: 3 * 24 * 3600,
        count: 500,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  })
}

/**
 * Set up the recurring nightly sync job.
 * Runs at 02:00 UTC every day.
 */
export async function scheduleNightlySync(
  queue: Queue<OpenDataSyncJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'nightly-open-data-sync',
    {
      pattern: '0 2 * * *',
    },
    {
      name: 'nightly-sync',
      data: {
        sources: ['skogsstyrelsen', 'lantmateriet', 'sentinel-hub'],
      },
    },
  )
}
