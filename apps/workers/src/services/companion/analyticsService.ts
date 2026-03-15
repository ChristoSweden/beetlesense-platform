/**
 * Companion analytics: logs interactions, latency, retrieval quality,
 * and user feedback for monitoring and improvement.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import type { ConfidenceLevel } from './guardrails.js'
import type { Intent } from './intentClassifier.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface LatencyBreakdown {
  embeddingMs: number
  retrievalMs: number
  classificationMs: number
  llmMs: number
  totalMs: number
}

export interface InteractionLog {
  sessionId: string
  messageId: string
  userId: string
  organizationId?: string
  parcelId?: string
  query: string
  intent: Intent
  intentConfidence: number
  detectedLanguage: 'en' | 'sv' | 'unknown'
  retrievalScores: number[]
  sourcesUsed: string[]
  responseConfidence: ConfidenceLevel
  responseTokens?: number
  latency: LatencyBreakdown
  guardrailTriggered?: string | null
  disclaimerAdded: boolean
}

// ── Service ───────────────────────────────────────────────────────────────

export class CompanionAnalyticsService {
  /**
   * Log a companion interaction.
   *
   * Stores analytics in the companion_messages.metadata JSONB column
   * for the assistant message, avoiding the need for a separate analytics
   * table in this sprint.
   */
  async logInteraction(data: InteractionLog): Promise<void> {
    const log = logger.child({
      sessionId: data.sessionId,
      messageId: data.messageId,
    })

    try {
      const supabase = getSupabaseAdmin()

      // Update the assistant message metadata with analytics
      const analyticsPayload = {
        analytics: {
          intent: data.intent,
          intentConfidence: data.intentConfidence,
          detectedLanguage: data.detectedLanguage,
          retrievalScores: data.retrievalScores,
          avgRetrievalScore:
            data.retrievalScores.length > 0
              ? data.retrievalScores.reduce((a, b) => a + b, 0) /
                data.retrievalScores.length
              : 0,
          sourcesUsed: data.sourcesUsed,
          sourceCount: data.sourcesUsed.length,
          responseConfidence: data.responseConfidence,
          responseTokens: data.responseTokens ?? null,
          latency: data.latency,
          guardrailTriggered: data.guardrailTriggered ?? null,
          disclaimerAdded: data.disclaimerAdded,
          loggedAt: new Date().toISOString(),
        },
      }

      const { error } = await supabase
        .from('companion_messages')
        .update({ metadata: analyticsPayload })
        .eq('id', data.messageId)

      if (error) {
        // Non-fatal — analytics loss is acceptable
        log.warn(
          { error: error.message },
          'Failed to update message with analytics metadata',
        )

        // Fallback: insert into a separate analytics row
        await this._fallbackLog(data)
      } else {
        log.debug('Interaction analytics logged')
      }
    } catch (err) {
      log.error({ err }, 'Analytics logging failed')
    }
  }

  /**
   * Log user feedback (thumbs up/down) for a specific message.
   */
  async logFeedback(
    sessionId: string,
    messageId: string,
    feedback: 'up' | 'down',
  ): Promise<void> {
    const log = logger.child({ sessionId, messageId, feedback })

    try {
      const supabase = getSupabaseAdmin()

      // Fetch existing metadata to merge
      const { data: existing, error: fetchErr } = await supabase
        .from('companion_messages')
        .select('metadata')
        .eq('id', messageId)
        .eq('session_id', sessionId)
        .single()

      if (fetchErr || !existing) {
        log.warn({ error: fetchErr?.message }, 'Message not found for feedback')
        return
      }

      const currentMetadata = (existing.metadata as Record<string, unknown>) ?? {}
      const updatedMetadata = {
        ...currentMetadata,
        feedback: {
          rating: feedback,
          timestamp: new Date().toISOString(),
        },
      }

      const { error: updateErr } = await supabase
        .from('companion_messages')
        .update({ metadata: updatedMetadata })
        .eq('id', messageId)

      if (updateErr) {
        log.warn({ error: updateErr.message }, 'Failed to store feedback')
      } else {
        log.info('User feedback recorded')
      }
    } catch (err) {
      log.error({ err }, 'Feedback logging failed')
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /**
   * Fallback: insert analytics as a system message in the session.
   * Used when updating the assistant message metadata fails.
   */
  private async _fallbackLog(data: InteractionLog): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()

      await supabase.from('companion_messages').insert({
        session_id: data.sessionId,
        role: 'system',
        content: '[analytics]',
        metadata: {
          analyticsFor: data.messageId,
          intent: data.intent,
          intentConfidence: data.intentConfidence,
          retrievalScores: data.retrievalScores,
          sourcesUsed: data.sourcesUsed,
          responseConfidence: data.responseConfidence,
          latency: data.latency,
          loggedAt: new Date().toISOString(),
        },
      })
    } catch {
      // Silently fail — analytics are best-effort
    }
  }
}
