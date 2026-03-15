import { Job, Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import {
  WEB_SEARCH_QUEUE,
  type WebSearchJobData,
} from '../queues/webSearch.queue.js'
import { ForestryNewsAggregator } from '../services/websearch/newsAggregator.js'
import { ForestryWebSearchService } from '../services/websearch/searchService.js'

/**
 * Web Search Worker
 *
 * Processes search jobs:
 * 1. Run queries (all categories or a specific one)
 * 2. Aggregate and score results
 * 3. Store curated results in Supabase
 * 4. Optionally notify users of notable new results
 */
export function createWebSearchWorker(): Worker<WebSearchJobData> {
  const worker = new Worker<WebSearchJobData>(
    WEB_SEARCH_QUEUE,
    async (job: Job<WebSearchJobData>) => {
      const log = createJobLogger(job.id!, WEB_SEARCH_QUEUE)
      const { category, customQuery, notify } = job.data

      log.info({ category, customQuery, notify }, 'Starting web search job')
      await job.updateProgress(5)

      const aggregator = new ForestryNewsAggregator()

      // Step 1: Run searches
      let curatedCount = 0

      if (customQuery) {
        // Ad-hoc custom query
        log.info({ query: customQuery }, 'Running custom search query')
        const searchService = new ForestryWebSearchService()
        const results = await searchService.searchCurrentEvents(customQuery, {
          freshness: 'week',
          maxResults: 10,
        })
        await searchService.cacheResults(results, category ?? 'FOREST_HEALTH', customQuery)
        curatedCount = results.length
        await job.updateProgress(60)
      } else if (category) {
        // Single category
        log.info({ category }, 'Aggregating single category')
        const results = await aggregator.aggregateCategory(category)
        curatedCount = await aggregator.storeCuratedResults(results)
        await job.updateProgress(60)
      } else {
        // All categories
        log.info('Aggregating all categories')
        await job.updateProgress(10)
        const results = await aggregator.aggregateAll()
        await job.updateProgress(70)
        curatedCount = await aggregator.storeCuratedResults(results)
      }

      await job.updateProgress(90)

      // Step 2: Notify (placeholder — integrate with notification system)
      if (notify && curatedCount > 0) {
        log.info({ curatedCount }, 'New curated news available for notification')
        // Future: push notification or realtime broadcast
      }

      await job.updateProgress(100)

      const summary = {
        category: category ?? 'all',
        customQuery: customQuery ?? null,
        curatedResults: curatedCount,
        notified: notify ?? false,
      }

      log.info(summary, 'Web search job completed')
      return summary
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // Serialize to respect API rate limits
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, WEB_SEARCH_QUEUE)
    log.info('Web search job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, WEB_SEARCH_QUEUE)
    log.error({ err }, 'Web search job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', WEB_SEARCH_QUEUE).error({ err }, 'Worker error')
  })

  return worker
}
