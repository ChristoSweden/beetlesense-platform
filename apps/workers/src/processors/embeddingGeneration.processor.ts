/**
 * BullMQ processor for embedding generation jobs.
 *
 * Job types:
 * - generate-all:    Find all rows in research_embeddings and regulatory_embeddings
 *                    where embedding IS NULL, batch-embed via OpenAI, and update.
 * - generate-single: Generate embedding for a specific row by ID and table.
 */

import type { Job } from 'bullmq'
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  EMBEDDING_GENERATION_QUEUE,
  type EmbeddingGenerationJobData,
} from '../queues/embeddingGeneration.queue.js'
import { generateEmbeddings } from '../services/openaiEmbedding.js'

const BATCH_SIZE = 20

interface EmbeddingRow {
  id: string
  content: string
}

/**
 * Fetch rows with null embeddings from a given table.
 */
async function fetchNullEmbeddingRows(
  table: string,
  limit = 1000,
): Promise<EmbeddingRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from(table)
    .select('id, content')
    .is('embedding', null)
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch null embedding rows from ${table}: ${error.message}`)
  }

  return (data ?? []) as EmbeddingRow[]
}

/**
 * Update a batch of rows with their generated embeddings.
 */
async function updateEmbeddings(
  table: string,
  rows: EmbeddingRow[],
  embeddings: number[][],
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Update each row individually (Supabase JS client doesn't support
  // batch updates with different values per row in a single call)
  const promises = rows.map((row, i) =>
    supabase
      .from(table)
      .update({ embedding: JSON.stringify(embeddings[i]) })
      .eq('id', row.id),
  )

  const results = await Promise.all(promises)

  for (const result of results) {
    if (result.error) {
      throw new Error(`Failed to update embedding: ${result.error.message}`)
    }
  }
}

/**
 * Process all null embeddings in a given table in batches of BATCH_SIZE.
 */
async function processTable(
  table: string,
  log: ReturnType<typeof createJobLogger>,
  job: Job<EmbeddingGenerationJobData>,
  progressOffset: number,
  progressWeight: number,
): Promise<number> {
  const rows = await fetchNullEmbeddingRows(table)

  if (rows.length === 0) {
    log.info({ table }, 'No null embeddings found')
    return 0
  }

  log.info({ table, count: rows.length }, 'Found rows with null embeddings')

  let processed = 0
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE)

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const texts = batch.map((row) => row.content)

    log.info(
      { table, batch: batchIndex, totalBatches, batchSize: batch.length },
      'Generating embeddings for batch',
    )

    const embeddings = await generateEmbeddings(texts)
    await updateEmbeddings(table, batch, embeddings)

    processed += batch.length
    log.info(
      { table, processed, total: rows.length },
      `Generated embeddings for ${processed}/${rows.length} rows`,
    )

    const batchProgress = progressOffset + (processed / rows.length) * progressWeight
    await job.updateProgress(Math.round(batchProgress))
  }

  return processed
}

export function createEmbeddingGenerationWorker(): Worker<EmbeddingGenerationJobData> {
  const worker = new Worker<EmbeddingGenerationJobData>(
    EMBEDDING_GENERATION_QUEUE,
    async (job: Job<EmbeddingGenerationJobData>) => {
      const log = createJobLogger(job.id!, EMBEDDING_GENERATION_QUEUE)
      const { type } = job.data

      switch (type) {
        case 'generate-all': {
          log.info('Starting embedding generation for all null embeddings')
          await job.updateProgress(0)

          // Process research_embeddings (0-50% progress)
          const researchCount = await processTable(
            'research_embeddings',
            log,
            job,
            0,
            50,
          )

          // Process regulatory_embeddings (50-100% progress)
          const regulatoryCount = await processTable(
            'regulatory_embeddings',
            log,
            job,
            50,
            50,
          )

          await job.updateProgress(100)

          const total = researchCount + regulatoryCount
          log.info(
            { researchCount, regulatoryCount, total },
            'Embedding generation completed',
          )

          return { researchCount, regulatoryCount, total }
        }

        case 'generate-single': {
          const { table, rowId } = job.data as {
            type: 'generate-single'
            table: 'research_embeddings' | 'regulatory_embeddings'
            rowId: string
          }

          log.info({ table, rowId }, 'Generating embedding for single row')
          await job.updateProgress(0)

          const supabase = getSupabaseAdmin()
          const { data, error } = await supabase
            .from(table)
            .select('id, content')
            .eq('id', rowId)
            .single()

          if (error || !data) {
            throw new Error(
              `Row not found: ${table}/${rowId} — ${error?.message ?? 'no data'}`,
            )
          }

          await job.updateProgress(20)

          const row = data as EmbeddingRow
          const embeddings = await generateEmbeddings([row.content])

          await job.updateProgress(80)

          await updateEmbeddings(table, [row], embeddings)

          await job.updateProgress(100)
          log.info({ table, rowId }, 'Single embedding generation completed')

          return { table, rowId, status: 'completed' }
        }

        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // Serialize to respect rate limits
      limiter: {
        max: 3,
        duration: 60_000, // Max 3 jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, EMBEDDING_GENERATION_QUEUE)
    log.info({ type: job.data.type }, 'Embedding generation job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, EMBEDDING_GENERATION_QUEUE)
    log.error({ type: job.data.type, err }, 'Embedding generation job failed')
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', EMBEDDING_GENERATION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
