import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const EMBEDDING_GENERATION_QUEUE = 'embedding-generation'

export type EmbeddingGenerationJobData =
  | {
      type: 'generate-all'
    }
  | {
      type: 'generate-single'
      table: 'research_embeddings' | 'regulatory_embeddings'
      rowId: string
    }

export function createEmbeddingGenerationQueue(): Queue<EmbeddingGenerationJobData> {
  return new Queue<EmbeddingGenerationJobData>(EMBEDDING_GENERATION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600,
        count: 500,
      },
      removeOnFail: {
        age: 30 * 24 * 3600,
      },
    },
  })
}

/**
 * Add a job to generate embeddings for all rows with null embeddings.
 */
export async function addGenerateAllEmbeddingsJob(
  queue: Queue<EmbeddingGenerationJobData>,
): Promise<string> {
  const job = await queue.add(
    'generate-all-embeddings',
    { type: 'generate-all' },
    { jobId: `generate-all-${Date.now()}` },
  )
  return job.id!
}

/**
 * Add a job to generate embedding for a single row.
 */
export async function addGenerateSingleEmbeddingJob(
  queue: Queue<EmbeddingGenerationJobData>,
  table: 'research_embeddings' | 'regulatory_embeddings',
  rowId: string,
): Promise<string> {
  const job = await queue.add(
    `generate-single-${table}-${rowId}`,
    { type: 'generate-single', table, rowId },
    { jobId: `generate-single-${table}-${rowId}` },
  )
  return job.id!
}
