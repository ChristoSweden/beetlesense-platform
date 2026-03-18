/**
 * Standalone CLI script to generate embeddings for all knowledge base rows
 * where `embedding IS NULL`.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in .env
 *   - GOOGLE_API_KEY in .env
 *
 * This script runs independently of BullMQ — it connects directly to Supabase
 * and calls the Google Gemini embedding API in batches of 20.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ''

const GOOGLE_EMBEDDING_MODEL = 'text-embedding-004'
const GOOGLE_EMBEDDING_DIM = 768
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const BATCH_SIZE = 20
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1_000
const MAX_INPUT_CHARS = 2048 * 4 // ~2048 tokens at ~4 chars/token

// ── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function truncateText(text: string): string {
  return text.length <= MAX_INPUT_CHARS ? text : text.slice(0, MAX_INPUT_CHARS)
}

interface GoogleBatchEmbeddingResponse {
  embeddings: Array<{ values: number[] }>
}

async function callGoogleBatch(texts: string[]): Promise<number[][]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `${GOOGLE_API_BASE}/models/${GOOGLE_EMBEDDING_MODEL}:batchEmbedContents?key=${GOOGLE_API_KEY}`

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
        const retryAfter = res.headers.get('retry-after')
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1_000
          : BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`  Rate limited, waiting ${waitMs}ms (attempt ${attempt + 1})`)
        await sleep(waitMs)
        continue
      }

      if (status >= 500) {
        const waitMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`  Server error ${status}, retrying in ${waitMs}ms`)
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
      console.warn(`  Network error, retrying in ${waitMs}ms: ${lastError.message}`)
      await sleep(waitMs)
    }
  }

  throw lastError ?? new Error('Embedding request failed after all retries')
}

// ── Progress bar ──────────────────────────────────────────────────────────

function printProgress(label: string, current: number, total: number): void {
  const pct = total > 0 ? Math.round((current / total) * 100) : 100
  const barLen = 30
  const filled = Math.round((pct / 100) * barLen)
  const bar = '#'.repeat(filled) + '-'.repeat(barLen - filled)
  process.stdout.write(`\r  [${bar}] ${pct}% (${current}/${total}) ${label}`)
  if (current === total) process.stdout.write('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────

interface EmbeddingRow {
  id: string
  content: string
}

async function processTable(
  supabase: ReturnType<typeof createClient>,
  table: string,
): Promise<number> {
  console.log(`\nProcessing: ${table}`)

  // Fetch all rows with null embeddings
  const { data, error } = await supabase
    .from(table)
    .select('id, content')
    .is('embedding', null)
    .limit(10_000)

  if (error) {
    console.error(`  Error fetching from ${table}: ${error.message}`)
    return 0
  }

  const rows = (data ?? []) as EmbeddingRow[]

  if (rows.length === 0) {
    console.log('  No rows with null embeddings.')
    return 0
  }

  console.log(`  Found ${rows.length} rows with null embeddings`)

  let processed = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const texts = batch.map((row) => truncateText(row.content))

    const embeddings = await callGoogleBatch(texts)

    // Update each row with its embedding
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]!
      const embedding = embeddings[j]!

      const { error: updateError } = await supabase
        .from(table)
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', row.id)

      if (updateError) {
        console.error(`\n  Failed to update ${row.id}: ${updateError.message}`)
      }
    }

    processed += batch.length
    printProgress(table, processed, rows.length)
  }

  return processed
}

async function main() {
  // Validate env
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_API_KEY in .env')
    process.exit(1)
  }

  console.log('=== BeetleSense Embedding Generator ===')
  console.log(`Model: ${GOOGLE_EMBEDDING_MODEL} (${GOOGLE_EMBEDDING_DIM} dimensions)`)
  console.log(`Batch size: ${BATCH_SIZE}\n`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const researchCount = await processTable(supabase, 'research_embeddings')
  const regulatoryCount = await processTable(supabase, 'regulatory_embeddings')

  const total = researchCount + regulatoryCount
  console.log(`\n=== Done: generated embeddings for ${total} rows ===`)
  console.log(`  research_embeddings:   ${researchCount}`)
  console.log(`  regulatory_embeddings: ${regulatoryCount}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
