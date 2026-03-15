import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const BLOG_GENERATION_QUEUE = 'blog-generation'

export interface BlogGenerationJobData {
  /** Force generation even if a post was already created today */
  force?: boolean
  /** Auto-publish the generated post */
  autoPublish?: boolean
  /** Optional: specify a topic/theme override */
  topic?: string
}

export function createBlogGenerationQueue(): Queue<BlogGenerationJobData> {
  return new Queue<BlogGenerationJobData>(BLOG_GENERATION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 30000,
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
 * Schedule daily blog generation.
 * Runs at 06:00 CET (05:00 UTC) every day.
 */
export async function scheduleDailyBlogGeneration(
  queue: Queue<BlogGenerationJobData>,
): Promise<void> {
  await queue.upsertJobScheduler(
    'daily-blog-generation',
    {
      pattern: '0 5 * * *', // 05:00 UTC = 06:00 CET
    },
    {
      name: 'daily-blog',
      data: {
        autoPublish: false,
      },
    },
  )
}

/**
 * Add an ad-hoc blog generation job.
 */
export async function addBlogGenerationJob(
  queue: Queue<BlogGenerationJobData>,
  data: BlogGenerationJobData,
): Promise<string> {
  const job = await queue.add('blog-generation', data)
  return job.id!
}
