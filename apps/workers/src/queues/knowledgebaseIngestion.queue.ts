import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'
import type { PaperMetadata } from '../services/knowledgebase/paperIngestion.js'
import type { RegulatoryDocument } from '../services/knowledgebase/regulatoryIngestion.js'

export const KNOWLEDGEBASE_INGESTION_QUEUE = 'knowledgebase-ingestion'

export type KnowledgebaseIngestionJobData =
  | {
      type: 'ingest_paper'
      pdfUrl: string
      metadata: PaperMetadata
    }
  | {
      type: 'ingest_batch'
      papers: PaperMetadata[]
    }
  | {
      type: 'ingest_regulatory'
      documents?: RegulatoryDocument[]
      preset?: 'skogsstyrelsen' | 'eu'
    }
  | {
      type: 'rebuild_index'
    }

export function createKnowledgebaseIngestionQueue(): Queue<KnowledgebaseIngestionJobData> {
  return new Queue<KnowledgebaseIngestionJobData>(KNOWLEDGEBASE_INGESTION_QUEUE, {
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
 * Add a single paper ingestion job.
 */
export async function addPaperIngestionJob(
  queue: Queue<KnowledgebaseIngestionJobData>,
  pdfUrl: string,
  metadata: PaperMetadata,
): Promise<string> {
  const job = await queue.add(
    `ingest-paper-${metadata.doi ?? metadata.title.slice(0, 40)}`,
    { type: 'ingest_paper', pdfUrl, metadata },
    {
      jobId: `paper-${metadata.doi ?? Date.now()}`,
    },
  )
  return job.id!
}

/**
 * Add a batch paper ingestion job.
 */
export async function addBatchIngestionJob(
  queue: Queue<KnowledgebaseIngestionJobData>,
  papers: PaperMetadata[],
): Promise<string> {
  const job = await queue.add(
    `ingest-batch-${papers.length}-papers`,
    { type: 'ingest_batch', papers },
  )
  return job.id!
}

/**
 * Add a regulatory ingestion job (custom docs or preset).
 */
export async function addRegulatoryIngestionJob(
  queue: Queue<KnowledgebaseIngestionJobData>,
  data: { documents?: RegulatoryDocument[]; preset?: 'skogsstyrelsen' | 'eu' },
): Promise<string> {
  const job = await queue.add(
    `ingest-regulatory-${data.preset ?? 'custom'}`,
    { type: 'ingest_regulatory', ...data },
  )
  return job.id!
}

/**
 * Add an index rebuild job.
 */
export async function addIndexRebuildJob(
  queue: Queue<KnowledgebaseIngestionJobData>,
): Promise<string> {
  const job = await queue.add(
    'rebuild-hnsw-indexes',
    { type: 'rebuild_index' },
    { jobId: 'rebuild-index-latest' },
  )
  return job.id!
}
