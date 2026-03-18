/**
 * Google Gemini embedding generation with rate limiting and retry logic.
 *
 * Uses text-embedding-004 (768 dimensions) to match the pgvector
 * column definitions in the knowledge base schema.
 */

import { logger } from '../../lib/logger.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

interface GoogleBatchEmbeddingResponse {
  embeddings: Array<{ values: number[] }>
}

// ── Token bucket rate limiter ──────────────────────────────────────────────

class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per ms

  constructor(maxRequestsPerMinute: number) {
    this.maxTokens = maxRequestsPerMinute
    this.tokens = maxRequestsPerMinute
    this.refillRate = maxRequestsPerMinute / 60_000
    this.lastRefill = Date.now()
  }

  async acquire(count = 1): Promise<void> {
    this.refill()

    while (this.tokens < count) {
      const waitMs = Math.ceil((count - this.tokens) / this.refillRate)
      await sleep(Math.min(waitMs, 5_000))
      this.refill()
    }

    this.tokens -= count
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Constants ─────────────────────────────────────────────────────────────

const GOOGLE_EMBEDDING_MODEL = 'text-embedding-004'
const GOOGLE_EMBEDDING_DIM = 768
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const BATCH_SIZE = 100
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1_000
const MAX_REQUESTS_PER_MINUTE = 1_500

// ── Service ───────────────────────────────────────────────────────────────

export class EmbeddingService {
  private readonly apiKey: string
  private readonly bucket: TokenBucket

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['GOOGLE_API_KEY']
    if (!key) {
      throw new Error('GOOGLE_API_KEY is required for EmbeddingService')
    }
    this.apiKey = key
    this.bucket = new TokenBucket(MAX_REQUESTS_PER_MINUTE)
  }

  /**
   * Embed a batch of texts. Automatically splits into sub-batches of 100
   * and respects the rate limit.
   */
  async embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return []

    const results: EmbeddingResult[] = new Array(texts.length)
    const batches = this._chunk(texts, BATCH_SIZE)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!
      const batchOffset = i * BATCH_SIZE

      await this.bucket.acquire(1)
      const vectors = await this._callBatchWithRetry(batch)

      for (let j = 0; j < vectors.length; j++) {
        results[batchOffset + j] = {
          embedding: vectors[j]!,
          tokenCount: 0, // Google API doesn't return per-item token counts
        }
      }

      logger.debug(
        { batchIndex: i + 1, totalBatches: batches.length, items: batch.length },
        'Embedding batch completed',
      )
    }

    return results
  }

  /**
   * Embed a single query string. Optimised path for retrieval-time embedding.
   */
  async embedQuery(query: string): Promise<number[]> {
    await this.bucket.acquire(1)
    return this._callSingleWithRetry(query)
  }

  /** Embedding dimension */
  get dimensions(): number {
    return GOOGLE_EMBEDDING_DIM
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _callSingleWithRetry(text: string): Promise<number[]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `${GOOGLE_API_BASE}/models/${GOOGLE_EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${GOOGLE_EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            outputDimensionality: GOOGLE_EMBEDDING_DIM,
          }),
        })

        if (res.ok) {
          const json = (await res.json()) as { embedding: { values: number[] } }
          return json.embedding.values
        }

        const status = res.status
        const body = await res.text()

        if (status === 429) {
          const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn({ attempt: attempt + 1, waitMs }, 'Google API rate limited, backing off')
          await sleep(waitMs)
          continue
        }

        if (status >= 500) {
          const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn({ attempt: attempt + 1, status, waitMs }, 'Google API server error, retrying')
          await sleep(waitMs)
          lastError = new Error(`Google Embedding API error (${status}): ${body}`)
          continue
        }

        throw new Error(`Google Embedding API error (${status}): ${body}`)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Google Embedding API error')) throw err
        lastError = err instanceof Error ? err : new Error(String(err))
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        logger.warn({ attempt: attempt + 1, err: lastError.message, waitMs }, 'Network error, retrying')
        await sleep(waitMs)
      }
    }

    throw lastError ?? new Error('Embedding request failed after all retries')
  }

  private async _callBatchWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `${GOOGLE_API_BASE}/models/${GOOGLE_EMBEDDING_MODEL}:batchEmbedContents?key=${this.apiKey}`

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: texts.map((text) => ({
              model: `models/${GOOGLE_EMBEDDING_MODEL}`,
              content: { parts: [{ text }] },
              outputDimensionality: GOOGLE_EMBEDDING_DIM,
            })),
          }),
        })

        if (res.ok) {
          const json = (await res.json()) as GoogleBatchEmbeddingResponse
          return json.embeddings.map((e) => e.values)
        }

        const status = res.status
        const body = await res.text()

        if (status === 429) {
          const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn({ attempt: attempt + 1, waitMs }, 'Google API rate limited, backing off')
          await sleep(waitMs)
          continue
        }

        if (status >= 500) {
          const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn({ attempt: attempt + 1, status, waitMs }, 'Google API server error, retrying')
          await sleep(waitMs)
          lastError = new Error(`Google Embedding API error (${status}): ${body}`)
          continue
        }

        throw new Error(`Google Embedding API error (${status}): ${body}`)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Google Embedding API error')) throw err
        lastError = err instanceof Error ? err : new Error(String(err))
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        logger.warn({ attempt: attempt + 1, err: lastError.message, waitMs }, 'Network error, retrying')
        await sleep(waitMs)
      }
    }

    throw lastError ?? new Error('Batch embedding request failed after all retries')
  }

  private _chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
}
