import { Queue } from 'bullmq'
import { getRedisConnection } from '../lib/redis.js'

export const KB_INGESTION_QUEUE = 'kb-ingestion'

export interface KbIngestionJobData {
  /** Type of document to ingest */
  documentType: 'research_paper' | 'regulatory_document'
  /** URL to download the PDF from */
  pdfUrl: string
  /** Document title */
  title: string
  /** Authors (for research papers) */
  authors?: string[]
  /** Publication year */
  year?: number
  /** DOI (for research papers) */
  doi?: string
  /** Issuing institution or authority */
  institution?: string
  /** Topic tags for categorisation */
  topicTags: string[]
  /** Abstract or summary (optional) */
  abstract?: string
  /** Journal name (for research papers) */
  journal?: string
  /** Jurisdiction (for regulatory documents) */
  jurisdiction?: string
  /** Document version (for regulatory documents) */
  documentVersion?: string
  /** Effective date ISO string (for regulatory documents) */
  effectiveDate?: string
  /** Who triggered the ingestion */
  triggeredBy?: string
}

export function createKbIngestionQueue(): Queue<KbIngestionJobData> {
  return new Queue<KbIngestionJobData>(KB_INGESTION_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 500,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  })
}

/**
 * Add a knowledge base ingestion job to the queue.
 */
export async function addKbIngestionJob(
  queue: Queue<KbIngestionJobData>,
  data: KbIngestionJobData,
): Promise<string> {
  const jobId = data.doi
    ? `kb-${data.documentType}-${data.doi.replace(/[^a-zA-Z0-9]/g, '_')}`
    : `kb-${data.documentType}-${data.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80)}`

  const job = await queue.add(`ingest-${data.documentType}`, data, {
    jobId,
  })
  return job.id!
}
