import { Job, Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { createJobLogger } from '../lib/logger.js'
import {
  KB_INGESTION_QUEUE,
  type KbIngestionJobData,
} from '../queues/kbIngestion.queue.js'
import { PaperIngestionService } from '../services/knowledgebase/paperIngestion.js'
import { RegulatoryIngestionService } from '../services/knowledgebase/regulatoryIngestion.js'

/**
 * Knowledge Base Ingestion Worker
 *
 * Pipeline:
 * 1. Determine document type (research paper or regulatory)
 * 2. Download PDF
 * 3. Extract text → chunk → embed via OpenAI
 * 4. Store embeddings in the appropriate pgvector table
 * 5. Report result
 */
export function createKbIngestionWorker(): Worker<KbIngestionJobData> {
  const paperService = new PaperIngestionService()
  const regulatoryService = new RegulatoryIngestionService()

  const worker = new Worker<KbIngestionJobData>(
    KB_INGESTION_QUEUE,
    async (job: Job<KbIngestionJobData>) => {
      const log = createJobLogger(job.id!, KB_INGESTION_QUEUE)
      const { documentType, pdfUrl, title } = job.data

      log.info({ documentType, title, url: pdfUrl }, 'Starting KB ingestion')

      if (documentType === 'research_paper') {
        const result = await paperService.ingestPaper(
          pdfUrl,
          {
            pdfUrl,
            title,
            authors: job.data.authors ?? [],
            year: job.data.year ?? new Date().getFullYear(),
            doi: job.data.doi,
            institution: job.data.institution,
            topicTags: job.data.topicTags,
            abstract: job.data.abstract,
            journal: job.data.journal,
          },
          (pct) => void job.updateProgress(pct),
        )

        log.info(
          {
            paperId: result.paperId,
            chunks: result.chunksStored,
            tokens: result.totalTokens,
            durationMs: result.durationMs,
          },
          'Research paper ingestion complete',
        )

        return result
      }

      if (documentType === 'regulatory_document') {
        // Download and extract text from PDF
        await job.updateProgress(5)
        log.info({ url: pdfUrl }, 'Downloading regulatory PDF')
        const pdfRes = await fetch(pdfUrl)
        if (!pdfRes.ok) {
          throw new Error(`Failed to download PDF (${pdfRes.status}): ${pdfUrl}`)
        }
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

        await job.updateProgress(15)
        const pdfParse = (await import('pdf-parse')).default
        const parsed = await pdfParse(pdfBuffer)
        const text = parsed.text

        if (!text || text.trim().length < 50) {
          throw new Error(
            `Insufficient text extracted from regulatory PDF (${text?.length ?? 0} chars)`,
          )
        }

        await job.updateProgress(25)
        const source = `regulatory:${title}`
        const jurisdiction = job.data.jurisdiction ?? 'SE'
        const topic = job.data.topicTags[0] ?? 'general'

        const result = await regulatoryService.ingestDocument(
          text,
          source,
          jurisdiction,
          topic,
          {
            title,
            effectiveDate: job.data.effectiveDate,
            version: job.data.documentVersion,
          },
        )

        await job.updateProgress(100)

        log.info(
          {
            source: result.source,
            chunks: result.chunksStored,
            tokens: result.totalTokens,
            durationMs: result.durationMs,
          },
          'Regulatory document ingestion complete',
        )

        return result
      }

      throw new Error(`Unknown document type: ${documentType}`)
    },
    {
      connection: createRedisConnection(),
      concurrency: 2, // Limit concurrency to avoid OpenAI rate limits
      limiter: {
        max: 5,
        duration: 60000, // Max 5 ingestion jobs per minute
      },
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, KB_INGESTION_QUEUE)
    log.info({ title: job.data.title }, 'KB ingestion job completed')
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, KB_INGESTION_QUEUE)
    log.error(
      { title: job.data.title, err },
      'KB ingestion job failed',
    )
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', KB_INGESTION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}
