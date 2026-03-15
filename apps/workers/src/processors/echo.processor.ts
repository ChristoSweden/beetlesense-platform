import { Job, Queue, Worker } from 'bullmq'
import { createRedisConnection, getRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'

export const ECHO_QUEUE = 'echo'

export interface EchoJobData {
  message: string
  delayMs?: number
}

export function createEchoQueue(): Queue<EchoJobData> {
  return new Queue<EchoJobData>(ECHO_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  })
}

/**
 * Echo Worker — simple test processor.
 * Receives a message, logs it, optionally waits, and returns it.
 * Useful for verifying the queue infrastructure is working.
 */
export function createEchoWorker(): Worker<EchoJobData> {
  const worker = new Worker<EchoJobData>(
    ECHO_QUEUE,
    async (job: Job<EchoJobData>) => {
      const log = createJobLogger(job.id!, ECHO_QUEUE)
      const { message, delayMs } = job.data

      log.info({ message }, 'Echo received')
      await job.updateProgress(50)

      if (delayMs && delayMs > 0) {
        log.info({ delayMs }, 'Echo delaying...')
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      await job.updateProgress(100)
      log.info({ message }, 'Echo complete')

      return { echo: message, processedAt: new Date().toISOString() }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, ECHO_QUEUE)
    log.info({ message: job.data.message }, 'Echo job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, ECHO_QUEUE)
    log.error({ err }, 'Echo job failed')
  })

  return worker
}
