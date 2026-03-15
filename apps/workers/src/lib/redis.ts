import Redis from 'ioredis'
import { config } from '../config.js'
import { logger } from './logger.js'

let connection: Redis | null = null

export function getRedisConnection(): Redis {
  if (connection) return connection

  connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000)
      logger.warn({ attempt: times, delayMs: delay }, 'Redis reconnecting...')
      return delay
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
      return targetErrors.some((e) => err.message.includes(e))
    },
  })

  connection.on('connect', () => {
    logger.info('Redis connected')
  })

  connection.on('ready', () => {
    logger.info('Redis ready')
  })

  connection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error')
  })

  connection.on('close', () => {
    logger.warn('Redis connection closed')
  })

  return connection
}

/**
 * Create a duplicate connection for BullMQ subscribers.
 * BullMQ requires separate connections for publisher and subscriber.
 */
export function createRedisConnection(): Redis {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000)
      return delay
    },
  })
}

export async function closeRedis(): Promise<void> {
  if (connection) {
    await connection.quit()
    connection = null
    logger.info('Redis connection closed gracefully')
  }
}
