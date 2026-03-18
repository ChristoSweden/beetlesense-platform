import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'
import type { Pix4dPipeline } from '../services/photogrammetry/pix4dClient.js'

export const PHOTOGRAMMETRY_QUEUE = 'photogrammetry'

export interface PhotogrammetryJobData {
  surveyId: string
  parcelId: string
  /** S3-sökvägar till drönarbilder */
  imagePaths: string[]
  /** Bearbetningspipeline: full (ortho+dsm+punktmoln), fast (ortho), volume (dtm+dsm+volym) */
  pipeline?: Pix4dPipeline
  /** Önskad markupplösning (GSD) i cm/pixel */
  gsd?: number
  /** Koordinatsystem — standard EPSG:3006 (SWEREF99 TM) */
  outputCrs?: string
  /** Kvalitetsnivå */
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'
  /** MicaSense multispektral kalibreringsdata */
  calibrationPanel?: {
    enabled: boolean
    panelAlbedo?: number[]
  }
}

export function createPhotogrammetryQueue(): Queue<PhotogrammetryJobData> {
  return new Queue<PhotogrammetryJobData>(PHOTOGRAMMETRY_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 60000 },
      // Fotogrammetri-jobb kan ta lång tid — behåll resultat längre
      removeOnComplete: { age: 14 * 24 * 3600, count: 200 },
      removeOnFail: { age: 60 * 24 * 3600 },
    },
  })
}

export async function addPhotogrammetryJob(
  queue: Queue<PhotogrammetryJobData>,
  data: PhotogrammetryJobData,
) {
  return queue.add(
    `photogrammetry-${data.parcelId}-${data.surveyId}`,
    data,
    {
      // Lägre prioritet (högre nummer) — fotogrammetri är resurskrävande
      priority: 3,
    },
  )
}
