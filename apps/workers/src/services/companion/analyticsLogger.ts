/**
 * Analytics logger for BeetleSense AI Companion interactions.
 *
 * Logs every companion query with intent, retrieval metadata, response
 * confidence, latency, and token usage to Supabase.  Uses batch inserts
 * for performance when processing high volumes.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import type { ConfidenceLevel } from './guardrails.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface CompanionInteraction {
  userId: string
  organizationId?: string
  parcelId?: string | null
  query: string
  intent: string
  intentConfidence: number
  detectedLanguage: string
  retrievedChunkIds: string[]
  retrievalDurationMs: number
  responseConfidence: ConfidenceLevel
  responseConfidenceScore: number
  latencyMs: number
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  streamingEnabled: boolean
  guardrailTriggered: boolean
  guardrailReason?: string
}

interface PendingRow {
  user_id: string
  organization_id: string | null
  parcel_id: string | null
  query: string
  intent: string
  intent_confidence: number
  detected_language: string
  retrieved_chunk_ids: string[]
  retrieval_duration_ms: number
  response_confidence: string
  response_confidence_score: number
  latency_ms: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  model: string
  streaming_enabled: boolean
  guardrail_triggered: boolean
  guardrail_reason: string | null
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 25
const FLUSH_INTERVAL_MS = 10_000 // flush every 10 seconds
const TABLE_NAME = 'companion_interactions'

// ── Service ───────────────────────────────────────────────────────────────

export class AnalyticsLogger {
  private buffer: PendingRow[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private flushing = false

  constructor() {
    this.flushTimer = setInterval(() => {
      void this._flush()
    }, FLUSH_INTERVAL_MS)
  }

  /**
   * Log a single companion interaction.
   * The row is buffered and batch-inserted for performance.
   */
  log(interaction: CompanionInteraction): void {
    const row: PendingRow = {
      user_id: interaction.userId,
      organization_id: interaction.organizationId ?? null,
      parcel_id: interaction.parcelId ?? null,
      query: interaction.query,
      intent: interaction.intent,
      intent_confidence: interaction.intentConfidence,
      detected_language: interaction.detectedLanguage,
      retrieved_chunk_ids: interaction.retrievedChunkIds,
      retrieval_duration_ms: interaction.retrievalDurationMs,
      response_confidence: interaction.responseConfidence,
      response_confidence_score: interaction.responseConfidenceScore,
      latency_ms: interaction.latencyMs,
      prompt_tokens: interaction.tokenUsage.promptTokens,
      completion_tokens: interaction.tokenUsage.completionTokens,
      total_tokens: interaction.tokenUsage.totalTokens,
      model: interaction.model,
      streaming_enabled: interaction.streamingEnabled,
      guardrail_triggered: interaction.guardrailTriggered,
      guardrail_reason: interaction.guardrailReason ?? null,
      created_at: new Date().toISOString(),
    }

    this.buffer.push(row)

    // Auto-flush when buffer reaches batch size
    if (this.buffer.length >= BATCH_SIZE) {
      void this._flush()
    }
  }

  /**
   * Flush all buffered rows to Supabase.
   * Call this during graceful shutdown to avoid data loss.
   */
  async flush(): Promise<void> {
    await this._flush()
  }

  /**
   * Stop the periodic flush timer and flush remaining rows.
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    await this._flush()
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return

    this.flushing = true
    const batch = this.buffer.splice(0, this.buffer.length)

    try {
      const supabase = getSupabaseAdmin()

      // Insert in sub-batches to stay within Supabase row limits
      for (let i = 0; i < batch.length; i += BATCH_SIZE) {
        const slice = batch.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from(TABLE_NAME).insert(slice)

        if (error) {
          logger.error(
            { error: error.message, rowCount: slice.length },
            'Failed to insert companion analytics batch',
          )
          // Put failed rows back at the front of the buffer for retry
          this.buffer.unshift(...slice)
        } else {
          logger.debug(
            { rowCount: slice.length },
            'Companion analytics batch inserted',
          )
        }
      }
    } catch (err) {
      logger.error({ err }, 'Unexpected error flushing companion analytics')
      // Put all rows back for retry
      this.buffer.unshift(...batch)
    } finally {
      this.flushing = false
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _instance: AnalyticsLogger | null = null

/**
 * Get or create the singleton analytics logger instance.
 */
export function getAnalyticsLogger(): AnalyticsLogger {
  if (!_instance) {
    _instance = new AnalyticsLogger()
  }
  return _instance
}
