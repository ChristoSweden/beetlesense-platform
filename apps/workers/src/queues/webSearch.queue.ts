import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'
import type { NewsCategory } from '../services/websearch/newsAggregator.js'

export const WEB_SEARCH_QUEUE = 'web-search'

export interface WebSearchJobData {
  /** Run all categories or a specific one */
  category?: NewsCategory
  /** Optional: ad-hoc query to search */
  customQuery?: string
  /** Whether to notify users of new results */
  notify?: boolean
}

export function createWebSearchQueue(): Queue<WebSearchJobData> {
  return new Queue<WebSearchJobData>(WEB_SEARCH_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 15000,
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

/**
 * Schedule recurring web search aggregation.
 * Runs every 6 hours to keep news fresh.
 */
export async function scheduleWebSearchSync(
  queue: Queue<WebSearchJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'scheduled-web-search',
    {
      pattern: '0 */6 * * *', // Every 6 hours
    },
    {
      name: 'scheduled-search',
      data: {
        notify: true,
      },
    },
  )
}

/**
 * Add an ad-hoc web search job.
 */
export async function addWebSearchJob(
  queue: Queue<WebSearchJobData>,
  data: WebSearchJobData,
): Promise<string> {
  const job = await queue.add('web-search', data)
  return job.id!
}
