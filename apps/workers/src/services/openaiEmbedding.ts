/**
 * Google Gemini embedding service for the embedding generation worker.
 *
 * Wraps Google's text-embedding-004 (768 dimensions) with:
 * - Token bucket rate limiting (max 1500 RPM for Gemini)
 * - Automatic text truncation
 * - Batch and single-text embedding methods
 * - Retry with exponential backoff on transient failures
 *
 * NOTE: File kept as openaiEmbedding.ts to preserve import paths.
 * The implementation now uses Google's Gemini API exclusively.
 */

import { logger } from '../lib/logger.js'

// ── Types ─────────────────────────────────────────────────────────────────

interface GoogleEmbeddingResponse {
  embedding: { values: number[] }
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
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1_000
const MAX_REQUESTS_PER_MINUTE = 1_500

/**
 * Google's text-embedding-004 supports up to ~2048 tokens.
 * We truncate by character estimate (1 token ~ 4 chars) to stay safe.
 */
const MAX_INPUT_TOKENS = 2048
const APPROX_CHARS_PER_TOKEN = 4
const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * APPROX_CHARS_PER_TOKEN

// ── Singleton bucket shared across calls ──────────────────────────────────

const rateLimitBucket = new TokenBucket(MAX_REQUESTS_PER_MINUTE)

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Truncate text to fit within the model's token limit.
 */
function truncateText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text
  logger.debug(
    { originalLength: text.length, truncatedLength: MAX_INPUT_CHARS },
    'Truncating text to fit token limit',
  )
  return text.slice(0, MAX_INPUT_CHARS)
}

/**
 * Generate embeddings for a batch of texts.
 * Uses Google's batchEmbedContents endpoint for efficiency.
 *
 * @param texts - Array of strings to embed
 * @returns Array of embedding vectors (number[][]), order matches input
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const truncated = texts.map(truncateText)

  // Google batch endpoint supports up to 100 items
  const BATCH_SIZE = 100
  const results: number[][] = []

  for (let i = 0; i < truncated.length; i += BATCH_SIZE) {
    const batch = truncated.slice(i, i + BATCH_SIZE)
    await rateLimitBucket.acquire(1)
    const batchResults = await callBatchWithRetry(batch)
    results.push(...batchResults)
  }

  return results
}

/**
 * Generate an embedding for a single text.
 *
 * @param text - The string to embed
 * @returns Embedding vector (number[])
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = truncateText(text)
  await rateLimitBucket.acquire(1)
  return callSingleWithRetry(truncated)
}

/** Embedding dimension — exposed for schema validation */
export const EMBEDDING_DIM = GOOGLE_EMBEDDING_DIM

// ── Internal helpers ──────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env['GOOGLE_API_KEY']
  if (!key) {
    throw new Error('GOOGLE_API_KEY environment variable is required')
  }
  return key
}

async function callSingleWithRetry(text: string): Promise<number[]> {
  const apiKey = getApiKey()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `${GOOGLE_API_BASE}/models/${GOOGLE_EMBEDDING_MODEL}:embedContent?key=${apiKey}`

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
        const json = (await res.json()) as GoogleEmbeddingResponse
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
      if (err instanceof Error && err.message.startsWith('Google Embedding API error')) {
        throw err
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
      logger.warn({ attempt: attempt + 1, err: lastError.message, waitMs }, 'Network error calling Google API, retrying')
      await sleep(waitMs)
    }
  }

  throw lastError ?? new Error('Embedding request failed after all retries')
}

async function callBatchWithRetry(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `${GOOGLE_API_BASE}/models/${GOOGLE_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`

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
      if (err instanceof Error && err.message.startsWith('Google Embedding API error')) {
        throw err
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
      logger.warn({ attempt: attempt + 1, err: lastError.message, waitMs }, 'Network error calling Google API, retrying')
      await sleep(waitMs)
    }
  }

  throw lastError ?? new Error('Batch embedding request failed after all retries')
}
