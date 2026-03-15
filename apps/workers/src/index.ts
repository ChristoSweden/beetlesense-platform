import 'dotenv/config'
import { Worker } from 'bullmq'
import { logger } from './lib/logger.js'
import { getRedisConnection, closeRedis } from './lib/redis.js'
import { initializeQueues, closeQueues, type QueueRegistry } from './queues/index.js'
import { createSurveyProcessingWorker } from './processors/surveyProcessing.processor.js'
import { createUploadValidationWorker } from './processors/uploadValidation.processor.js'
import { createOpenDataSyncWorker } from './processors/openDataSync.processor.js'
import { createSatelliteFetchWorker } from './processors/satelliteFetch.processor.js'
import { createLidarProcessingWorker } from './processors/lidarProcessing.processor.js'
import { createEchoWorker } from './processors/echo.processor.js'
import { createKnowledgebaseIngestionWorker } from './processors/knowledgebaseIngestion.processor.js'
import { createProjectContextWorker } from './processors/projectContext.processor.js'
import { createWebSearchWorker } from './processors/webSearch.processor.js'
import { createBlogGenerationWorker } from './processors/blogGeneration.processor.js'
import { createReportGenerationWorker } from './processors/reportGeneration.processor.js'

let queues: QueueRegistry | null = null
const workers: Worker[] = []
let isShuttingDown = false

async function main() {
  logger.info('=== BeetleSense Workers starting ===')

  // Step 1: Verify Redis connectivity
  const redis = getRedisConnection()
  try {
    const pong = await redis.ping()
    logger.info({ pong }, 'Redis connection verified')
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to Redis. Aborting.')
    process.exit(1)
  }

  // Step 2: Initialize all queues
  queues = await initializeQueues()

  // Step 3: Register all workers (processors)
  const surveyWorker = createSurveyProcessingWorker()
  workers.push(surveyWorker)
  logger.info('Registered: survey-processing worker')

  const uploadWorker = createUploadValidationWorker()
  workers.push(uploadWorker)
  logger.info('Registered: upload-validation worker')

  const openDataWorker = createOpenDataSyncWorker()
  workers.push(openDataWorker)
  logger.info('Registered: open-data-sync worker')

  const satelliteWorker = createSatelliteFetchWorker()
  workers.push(satelliteWorker)
  logger.info('Registered: satellite-fetch worker')

  const lidarWorker = createLidarProcessingWorker()
  workers.push(lidarWorker)
  logger.info('Registered: lidar-processing worker')

  const echoWorker = createEchoWorker()
  workers.push(echoWorker)
  logger.info('Registered: echo worker')

  const kbIngestionWorker = createKnowledgebaseIngestionWorker()
  workers.push(kbIngestionWorker)
  logger.info('Registered: knowledgebase-ingestion worker')

  const projectContextWorker = createProjectContextWorker()
  workers.push(projectContextWorker)
  logger.info('Registered: project-context worker')

  const webSearchWorker = createWebSearchWorker()
  workers.push(webSearchWorker)
  logger.info('Registered: web-search worker')

  const blogGenerationWorker = createBlogGenerationWorker()
  workers.push(blogGenerationWorker)
  logger.info('Registered: blog-generation worker')

  const reportGenerationWorker = createReportGenerationWorker()
  workers.push(reportGenerationWorker)
  logger.info('Registered: report-generation worker')

  logger.info(
    { workerCount: workers.length },
    '=== BeetleSense Workers ready ===',
  )
}

/**
 * Graceful shutdown: close workers (drain active jobs), then queues, then Redis.
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring duplicate signal')
    return
  }
  isShuttingDown = true

  logger.info({ signal }, 'Shutdown signal received. Draining workers...')

  // Close workers first — they will finish active jobs before closing
  const workerClosePromises = workers.map(async (worker) => {
    try {
      await worker.close()
      logger.info({ workerName: worker.name }, 'Worker closed')
    } catch (err) {
      logger.error({ workerName: worker.name, err }, 'Error closing worker')
    }
  })

  // Wait for all workers to drain with a timeout
  const DRAIN_TIMEOUT_MS = 30_000
  try {
    await Promise.race([
      Promise.all(workerClosePromises),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Worker drain timeout')),
          DRAIN_TIMEOUT_MS,
        ),
      ),
    ])
    logger.info('All workers drained successfully')
  } catch (err) {
    logger.error({ err }, 'Worker drain timed out, forcing shutdown')
  }

  // Close queues
  if (queues) {
    try {
      await closeQueues(queues)
    } catch (err) {
      logger.error({ err }, 'Error closing queues')
    }
  }

  // Close Redis
  try {
    await closeRedis()
  } catch (err) {
    logger.error({ err }, 'Error closing Redis')
  }

  logger.info('Shutdown complete. Goodbye.')
  process.exit(0)
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception')
  shutdown('uncaughtException').catch(() => process.exit(1))
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection')
  shutdown('unhandledRejection').catch(() => process.exit(1))
})

// Start
main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup')
  process.exit(1)
})
