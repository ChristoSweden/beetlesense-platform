/**
 * OpenAI embedding generation with rate limiting and retry logic.
 *
 * Uses text-embedding-3-small (1536 dimensions) to match the pgvector
 * column definitions in 001_foundation.sql.
 */

import { logger } from '../../lib/logger.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { prompt_tokens: number; total_tokens: number }
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

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
const OPENAI_EMBEDDING_DIM = 1536
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const BATCH_SIZE = 100
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1_000
const MAX_REQUESTS_PER_MINUTE = 3_000

// ── Service ───────────────────────────────────────────────────────────────

export class EmbeddingService {
  private readonly apiKey: string
  private readonly bucket: TokenBucket

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['OPENAI_API_KEY']
    if (!key) {
      throw new Error('OPENAI_API_KEY is required for EmbeddingService')
    }
    this.apiKey = key
    this.bucket = new TokenBucket(MAX_REQUESTS_PER_MINUTE)
  }

  /**
   * Embed a batch of texts.  Automatically splits into sub-batches of 100
   * and respects the 3 000 RPM rate limit.
   */
  async embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return []

    const results: EmbeddingResult[] = new Array(texts.length)
    const batches = this._chunk(texts, BATCH_SIZE)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!
      const batchOffset = i * BATCH_SIZE

      await this.bucket.acquire(1)
      const response = await this._callWithRetry(batch)

      for (const item of response.data) {
        results[batchOffset + item.index] = {
          embedding: item.embedding,
          tokenCount: 0, // per-item token count not provided; use total
        }
      }

      // Distribute total tokens across items (approximate)
      const tokensPerItem = Math.ceil(response.usage.prompt_tokens / batch.length)
      for (let j = 0; j < batch.length; j++) {
        const result = results[batchOffset + j]
        if (result) result.tokenCount = tokensPerItem
      }

      logger.debug(
        { batchIndex: i + 1, totalBatches: batches.length, tokens: response.usage.total_tokens },
        'Embedding batch completed',
      )
    }

    return results
  }

  /**
   * Embed a single query string.  Optimised path for retrieval-time embedding.
   */
  async embedQuery(query: string): Promise<number[]> {
    await this.bucket.acquire(1)
    const response = await this._callWithRetry([query])
    return response.data[0]!.embedding
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _callWithRetry(texts: string[]): Promise<OpenAIEmbeddingResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_EMBEDDING_MODEL,
            input: texts,
            dimensions: OPENAI_EMBEDDING_DIM,
          }),
        })

        if (res.ok) {
          return (await res.json()) as OpenAIEmbeddingResponse
        }

        const status = res.status
        const body = await res.text()

        // Rate-limited — back off and retry
        if (status === 429) {
          const retryAfter = res.headers.get('retry-after')
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1_000
            : BASE_RETRY_DELAY_MS * Math.pow(2, attempt)

          logger.warn(
            { attempt: attempt + 1, waitMs },
            'OpenAI rate limited, backing off',
          )
          await sleep(waitMs)
          continue
        }

        // Server errors — retry with backoff
        if (status >= 500) {
          const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn(
            { attempt: attempt + 1, status, waitMs },
            'OpenAI server error, retrying',
          )
          await sleep(waitMs)
          lastError = new Error(`OpenAI API error (${status}): ${body}`)
          continue
        }

        // Client error (400, 401, etc.) — do not retry
        throw new Error(`OpenAI API error (${status}): ${body}`)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('OpenAI API error')) {
          throw err
        }
        // Network error — retry
        lastError = err instanceof Error ? err : new Error(String(err))
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        logger.warn(
          { attempt: attempt + 1, err: lastError.message, waitMs },
          'Network error calling OpenAI, retrying',
        )
        await sleep(waitMs)
      }
    }

    throw lastError ?? new Error('Embedding request failed after all retries')
  }

  private _chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
}
