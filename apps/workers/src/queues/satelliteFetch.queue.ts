import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const SATELLITE_FETCH_QUEUE = 'satellite-fetch'

export interface SatelliteFetchJobData {
  parcelId: string
  organizationId: string
  source: 'sentinel-2' | 'landsat-9' | 'planet'
  dateRange: {
    start: string // ISO date
    end: string
  }
  maxCloudCover: number
  bands?: string[]
}

export function createSatelliteFetchQueue(): Queue<SatelliteFetchJobData> {
  return new Queue<SatelliteFetchJobData>(SATELLITE_FETCH_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 15000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  })
}
