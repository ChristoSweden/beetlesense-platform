import type { Job} from 'bullmq';
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import {
  BLOG_GENERATION_QUEUE,
  type BlogGenerationJobData,
} from '../queues/blogGeneration.queue.js'
import { BlogScheduler } from '../services/blog/blogScheduler.js'

/**
 * Blog Generation Worker
 *
 * Processes blog generation jobs:
 * 1. Check if a post was already generated today (unless forced)
 * 2. Fetch curated news from yesterday
 * 3. Generate blog post via Claude API
 * 4. Store and optionally publish
 */
export function createBlogGenerationWorker(): Worker<BlogGenerationJobData> {
  const worker = new Worker<BlogGenerationJobData>(
    BLOG_GENERATION_QUEUE,
    async (job: Job<BlogGenerationJobData>) => {
      const log = createJobLogger(job.id!, BLOG_GENERATION_QUEUE)
      const { force, autoPublish } = job.data

      log.info({ force, autoPublish }, 'Starting blog generation job')
      await job.updateProgress(5)

      const scheduler = new BlogScheduler({
        autoPublish: autoPublish ?? false,
      })

      // Step 1: Check for duplicate generation
      if (!force) {
        const alreadyGenerated = await scheduler.hasGeneratedToday()
        if (alreadyGenerated) {
          log.info('Blog post already generated today — skipping (use force=true to override)')
          await job.updateProgress(100)
          return { skipped: true, reason: 'already_generated_today' }
        }
      }

      await job.updateProgress(10)

      // Step 2: Run the daily generation pipeline
      const postId = await scheduler.runDailyGeneration()
      await job.updateProgress(90)

      if (!postId) {
        log.info('No blog post generated (insufficient news)')
        await job.updateProgress(100)
        return { skipped: true, reason: 'insufficient_news' }
      }

      await job.updateProgress(100)

      const summary = {
        postId,
        autoPublished: autoPublish ?? false,
        forced: force ?? false,
      }

      log.info(summary, 'Blog generation job completed')
      return summary
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // Only one blog generation at a time
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, BLOG_GENERATION_QUEUE)
    log.info('Blog generation job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, BLOG_GENERATION_QUEUE)
    log.error({ err }, 'Blog generation job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', BLOG_GENERATION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
