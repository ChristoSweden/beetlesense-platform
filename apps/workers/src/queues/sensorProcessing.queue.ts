import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const SENSOR_PROCESSING_QUEUE = 'sensor-processing'

export type SensorType = 'multispectral' | 'thermal' | 'rgb'

export interface SensorProcessingJobData {
  surveyId: string
  parcelId: string
  sensorType: SensorType
  /** S3 paths to the raw input files for this sensor */
  inputPaths: string[]
  /** S3 output prefix for derived products */
  outputDir: string
  /** Optional parcel boundary GeoJSON for clipping */
  parcelBoundaryWkt?: string
}

export function createSensorProcessingQueue(): Queue<SensorProcessingJobData> {
  return new Queue<SensorProcessingJobData>(SENSOR_PROCESSING_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  })
}

export async function addSensorProcessingJob(
  queue: Queue<SensorProcessingJobData>,
  data: SensorProcessingJobData,
) {
  return queue.add(`sensor-${data.sensorType}-${data.surveyId}`, data, {
    priority: data.sensorType === 'multispectral' ? 1 : 2,
  })
}
