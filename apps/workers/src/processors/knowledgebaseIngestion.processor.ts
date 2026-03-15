/**
 * BullMQ processor for knowledge base ingestion jobs.
 *
 * Job types:
 * - ingest_paper:      Download a single PDF, extract, chunk, embed, store
 * - ingest_batch:      Process an array of papers sequentially
 * - ingest_regulatory: Ingest regulatory/guideline documents
 * - rebuild_index:     Trigger REINDEX on pgvector HNSW indexes
 */

import { Job, Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  KNOWLEDGEBASE_INGESTION_QUEUE,
  type KnowledgebaseIngestionJobData,
} from '../queues/knowledgebaseIngestion.queue.js'
import {
  PaperIngestionService,
  type PaperMetadata,
} from '../services/knowledgebase/paperIngestion.js'
import {
  RegulatoryIngestionService,
  type RegulatoryDocument,
} from '../services/knowledgebase/regulatoryIngestion.js'

export function createKnowledgebaseIngestionWorker(): Worker<KnowledgebaseIngestionJobData> {
  const paperService = new PaperIngestionService()
  const regulatoryService = new RegulatoryIngestionService()

  const worker = new Worker<KnowledgebaseIngestionJobData>(
    KNOWLEDGEBASE_INGESTION_QUEUE,
    async (job: Job<KnowledgebaseIngestionJobData>) => {
      const log = createJobLogger(job.id!, KNOWLEDGEBASE_INGESTION_QUEUE)
      const { type } = job.data

      switch (type) {
        case 'ingest_paper': {
          const { pdfUrl, metadata } = job.data as {
            type: 'ingest_paper'
            pdfUrl: string
            metadata: PaperMetadata
          }

          log.info({ title: metadata.title }, 'Starting paper ingestion')

          const result = await paperService.ingestPaper(
            pdfUrl,
            metadata,
            (pct) => job.updateProgress(pct),
          )

          log.info(
            { paperId: result.paperId, chunks: result.chunksStored },
            'Paper ingestion completed',
          )

          return result
        }

        case 'ingest_batch': {
          const { papers } = job.data as {
            type: 'ingest_batch'
            papers: PaperMetadata[]
          }

          log.info({ count: papers.length }, 'Starting batch paper ingestion')

          const results = await paperService.ingestBatch(
            papers,
            (completed, total) => {
              const pct = Math.round((completed / total) * 100)
              job.updateProgress(pct)
            },
          )

          const successful = results.filter((r) => r.chunksStored > 0).length
          log.info(
            { total: papers.length, successful },
            'Batch paper ingestion completed',
          )

          return { total: papers.length, successful, results }
        }

        case 'ingest_regulatory': {
          const { documents, preset } = job.data as {
            type: 'ingest_regulatory'
            documents?: RegulatoryDocument[]
            preset?: 'skogsstyrelsen' | 'eu'
          }

          log.info(
            { documentCount: documents?.length, preset },
            'Starting regulatory ingestion',
          )

          let results

          if (preset === 'skogsstyrelsen') {
            results = await regulatoryService.ingestSkogsstyrelsenGuidelines()
          } else if (preset === 'eu') {
            results = await regulatoryService.ingestEURegulations()
          } else if (documents && documents.length > 0) {
            results = await regulatoryService.ingestBatch(documents)
          } else {
            throw new Error(
              'ingest_regulatory requires either documents array or a preset name',
            )
          }

          await job.updateProgress(100)

          const successful = results.filter((r) => r.chunksStored > 0).length
          log.info(
            { total: results.length, successful },
            'Regulatory ingestion completed',
          )

          return { total: results.length, successful, results }
        }

        case 'rebuild_index': {
          log.info('Starting pgvector HNSW index rebuild')
          await job.updateProgress(10)

          const supabase = getSupabaseAdmin()

          // REINDEX each embedding table's HNSW index
          const indexes = [
            'research_embeddings_embedding_idx',
            'regulatory_embeddings_embedding_idx',
            'user_data_embeddings_embedding_idx',
          ]

          for (let i = 0; i < indexes.length; i++) {
            const indexName = indexes[i]!
            log.info({ indexName }, 'Rebuilding index')

            const { error } = await supabase.rpc('execute_sql', {
              sql: `REINDEX INDEX CONCURRENTLY ${indexName}`,
            })

            if (error) {
              log.warn(
                { indexName, error: error.message },
                'Index rebuild failed (may require direct DB access)',
              )
            }

            await job.updateProgress(
              10 + Math.round(((i + 1) / indexes.length) * 90),
            )
          }

          log.info('Index rebuild completed')
          return { indexes, status: 'completed' }
        }

        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60_000, // Max 5 jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, KNOWLEDGEBASE_INGESTION_QUEUE)
    log.info({ type: job.data.type }, 'KB ingestion job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, KNOWLEDGEBASE_INGESTION_QUEUE)
    log.error({ type: job.data.type, err }, 'KB ingestion job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', KNOWLEDGEBASE_INGESTION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
