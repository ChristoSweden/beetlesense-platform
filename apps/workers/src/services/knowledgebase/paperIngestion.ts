/**
 * Research paper ingestion pipeline.
 *
 * Downloads PDFs, extracts text via pdf-parse, chunks, embeds via OpenAI,
 * and stores in the `research_embeddings` table with full metadata.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { RecursiveTextSplitter, type TextChunk } from './chunkingService.js'
import { EmbeddingService } from './embeddingService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface PaperMetadata {
  pdfUrl: string
  title: string
  authors: string[]
  year: number
  doi?: string
  institution?: string
  topicTags: string[]
  abstract?: string
  journal?: string
}

export interface EmbeddedChunk {
  content: string
  embedding: number[]
  chunkIndex: number
  tokenEstimate: number
  metadata: Record<string, unknown>
}

export interface IngestionResult {
  paperId: string
  title: string
  chunksStored: number
  totalTokens: number
  durationMs: number
}

// ── Constants ─────────────────────────────────────────────────────────────

const CHUNK_MAX_TOKENS = 512
const CHUNK_OVERLAP = 64
const BATCH_INSERT_SIZE = 50
const RATE_LIMIT_DELAY_MS = 200 // delay between batch ingestions

// ── Service ───────────────────────────────────────────────────────────────

export class PaperIngestionService {
  private readonly splitter: RecursiveTextSplitter
  private readonly embedder: EmbeddingService

  constructor(embedder?: EmbeddingService) {
    this.splitter = new RecursiveTextSplitter(CHUNK_MAX_TOKENS, CHUNK_OVERLAP)
    this.embedder = embedder ?? new EmbeddingService()
  }

  /**
   * Full pipeline: download PDF → extract text → chunk → embed → store.
   */
  async ingestPaper(
    pdfUrl: string,
    metadata: PaperMetadata,
    onProgress?: (pct: number) => void,
  ): Promise<IngestionResult> {
    const start = Date.now()
    const log = logger.child({ paper: metadata.title, doi: metadata.doi })

    // Step 1: Download PDF
    onProgress?.(5)
    log.info({ url: pdfUrl }, 'Downloading PDF')
    const pdfBuffer = await this._downloadPdf(pdfUrl)

    // Step 2: Extract text
    onProgress?.(15)
    log.info('Extracting text from PDF')
    const text = await this._extractText(pdfBuffer)

    if (!text || text.trim().length < 100) {
      throw new Error(
        `Insufficient text extracted from PDF (${text?.length ?? 0} chars). ` +
        'The PDF may be image-based and require OCR.',
      )
    }
    log.info({ textLength: text.length }, 'Text extracted')

    // Step 3: Chunk
    onProgress?.(25)
    const paperMeta: Record<string, unknown> = {
      title: metadata.title,
      authors: metadata.authors,
      year: metadata.year,
      doi: metadata.doi ?? null,
      institution: metadata.institution ?? null,
      journal: metadata.journal ?? null,
      topicTags: metadata.topicTags,
      source: `paper:${metadata.doi ?? metadata.title}`,
    }

    const chunks = this.splitter.createChunksWithContext(text, paperMeta)
    log.info({ chunkCount: chunks.length }, 'Text chunked')

    // Step 4: Embed
    onProgress?.(40)
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await this.embedder.embedTexts(chunkTexts)
    log.info({ embeddingCount: embeddings.length }, 'Embeddings generated')

    // Step 5: Store in research_embeddings
    onProgress?.(70)
    const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, i) => ({
      content: chunk.content,
      embedding: embeddings[i]!.embedding,
      chunkIndex: chunk.index,
      tokenEstimate: chunk.tokenEstimate,
      metadata: chunk.metadata,
    }))

    const paperId = await this._storeChunks(embeddedChunks, metadata)
    onProgress?.(100)

    const duration = Date.now() - start
    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokenCount, 0)

    log.info(
      { paperId, chunks: embeddedChunks.length, totalTokens, durationMs: duration },
      'Paper ingestion complete',
    )

    return {
      paperId,
      title: metadata.title,
      chunksStored: embeddedChunks.length,
      totalTokens,
      durationMs: duration,
    }
  }

  /**
   * Batch-ingest multiple papers sequentially with rate limiting.
   */
  async ingestBatch(
    papers: PaperMetadata[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<IngestionResult[]> {
    const results: IngestionResult[] = []
    const log = logger.child({ batchSize: papers.length })

    log.info('Starting batch paper ingestion')

    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i]!
      try {
        const result = await this.ingestPaper(paper.pdfUrl, paper)
        results.push(result)
        onProgress?.(i + 1, papers.length)
      } catch (err) {
        log.error(
          { title: paper.title, doi: paper.doi, err },
          'Failed to ingest paper, continuing batch',
        )
        results.push({
          paperId: '',
          title: paper.title,
          chunksStored: 0,
          totalTokens: 0,
          durationMs: 0,
        })
      }

      // Rate limit between papers
      if (i < papers.length - 1) {
        await this._sleep(RATE_LIMIT_DELAY_MS)
      }
    }

    const successful = results.filter((r) => r.chunksStored > 0).length
    log.info(
      { total: papers.length, successful, failed: papers.length - successful },
      'Batch ingestion complete',
    )

    return results
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _downloadPdf(url: string): Promise<Buffer> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to download PDF (${res.status}): ${url}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async _extractText(pdfBuffer: Buffer): Promise<string> {
    // Dynamic import to allow the worker to start even if pdf-parse is not
    // installed (it would fail only when this code path is exercised).
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(pdfBuffer)
    return result.text
  }

  private async _storeChunks(
    chunks: EmbeddedChunk[],
    metadata: PaperMetadata,
  ): Promise<string> {
    const supabase = getSupabaseAdmin()

    // Generate a deterministic paper ID from DOI or title
    const paperId = metadata.doi
      ? `paper_${metadata.doi.replace(/[^a-zA-Z0-9]/g, '_')}`
      : `paper_${metadata.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80)}`

    // Delete existing chunks for this paper (idempotent re-ingestion)
    await supabase
      .from('research_embeddings')
      .delete()
      .eq('source', `paper:${metadata.doi ?? metadata.title}`)

    // Insert in batches
    for (let i = 0; i < chunks.length; i += BATCH_INSERT_SIZE) {
      const batch = chunks.slice(i, i + BATCH_INSERT_SIZE)
      const rows = batch.map((chunk) => ({
        content: chunk.content,
        embedding: JSON.stringify(chunk.embedding),
        source: `paper:${metadata.doi ?? metadata.title}`,
        chunk_index: chunk.chunkIndex,
        token_count: chunk.tokenEstimate,
        metadata: {
          title: metadata.title,
          authors: metadata.authors,
          year: metadata.year,
          doi: metadata.doi ?? null,
          institution: metadata.institution ?? null,
          journal: metadata.journal ?? null,
          topic_tags: metadata.topicTags,
          paper_id: paperId,
        },
      }))

      const { error } = await supabase
        .from('research_embeddings')
        .insert(rows)

      if (error) {
        throw new Error(
          `Failed to insert research embeddings batch (offset ${i}): ${error.message}`,
        )
      }
    }

    return paperId
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
