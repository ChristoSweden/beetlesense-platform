/**
 * Builds the full Claude message array from retrieved context, conversation
 * history, and system-level instructions.
 *
 * Manages a token budget (12k context + 4k response) to keep the prompt
 * within model limits.
 */

import { estimateTokens } from '../knowledgebase/chunkingService.js'
import type { RetrievalResult, StructuredContext, SourceCitation } from './retrievalService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AssembledContext {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  tokenEstimate: number
  sourcesUsed: SourceCitation[]
}

// ── Constants ─────────────────────────────────────────────────────────────

const CONTEXT_TOKEN_BUDGET = 12_000
const RESPONSE_TOKEN_BUDGET = 4_000
const MAX_HISTORY_TURNS = 10
const SYSTEM_PROMPT_BASE_TOKENS = 600 // rough estimate for the base prompt

const SYSTEM_PROMPT = `You are the BeetleSense Forest Advisor — an expert AI companion \
specialising in Scandinavian forestry, forest health, bark beetle management, and sustainable \
silviculture. You help forest owners, managers, and consultants in Sweden and the Nordics.

## Guidelines
- Answer in the same language the user writes in (Swedish or English).
- Always cite your sources using [Source: <title>] format when referencing research or regulations.
- Stay strictly within the forestry domain. Politely decline questions outside this scope.
- When you lack sufficient information, say so honestly and suggest next steps.
- Use metric units. Reference Swedish standards (Skogsstyrelsen, SLU) where applicable.
- Be practical and actionable — forest owners need concrete advice.
- If referencing satellite data or survey results, clarify the data date and resolution.

## Confidence
- If your answer is based on strong evidence from retrieved sources, state your confidence.
- If making inferences beyond the provided data, flag them as estimates.
- For regulatory questions, recommend consulting Skogsstyrelsen or a certified advisor for binding guidance.

## Citation Format
When your answer draws on specific sources, cite them inline:
  "Bark beetle populations typically peak in late June [Source: SLU Bark Beetle Report 2024]."

## Response Format
- Use markdown formatting for readability.
- Use bullet points for lists of recommendations.
- Include section headers for longer answers.`

// ── Service ───────────────────────────────────────────────────────────────

export class ContextAssembler {
  /**
   * Assemble the full messages array for the Claude API call.
   */
  assemble(
    retrievedChunks: RetrievalResult[],
    conversationHistory: Message[],
    intent: string,
    maxTokens: number = CONTEXT_TOKEN_BUDGET,
    structuredContext?: StructuredContext | null,
  ): AssembledContext {
    let remainingTokens = maxTokens - SYSTEM_PROMPT_BASE_TOKENS

    // 1. Build context sections from retrieved chunks
    const { contextBlock, tokensUsed, sources } = this._buildContextBlock(
      retrievedChunks,
      remainingTokens * 0.6, // allocate 60% of budget to RAG context
      structuredContext,
    )
    remainingTokens -= tokensUsed

    // 2. Build intent-specific instructions
    const intentInstructions = this._getIntentInstructions(intent)

    // 3. Assemble system prompt
    const systemPrompt = [
      SYSTEM_PROMPT,
      intentInstructions,
      contextBlock,
    ]
      .filter(Boolean)
      .join('\n\n')

    // 4. Trim conversation history to fit budget
    const trimmedHistory = this._trimHistory(
      conversationHistory,
      remainingTokens,
    )

    const totalTokens =
      estimateTokens(systemPrompt) +
      trimmedHistory.reduce((sum, m) => sum + estimateTokens(m.content), 0)

    return {
      systemPrompt,
      messages: trimmedHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tokenEstimate: totalTokens,
      sourcesUsed: sources,
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _buildContextBlock(
    chunks: RetrievalResult[],
    tokenBudget: number,
    structuredContext?: StructuredContext | null,
  ): { contextBlock: string; tokensUsed: number; sources: SourceCitation[] } {
    if (chunks.length === 0 && !structuredContext) {
      return { contextBlock: '', tokensUsed: 0, sources: [] }
    }

    const sections: string[] = []
    const sources: SourceCitation[] = []
    let tokensUsed = 0

    // Group chunks by layer
    const research = chunks.filter((c) => c.layer === 'research')
    const regulatory = chunks.filter((c) => c.layer === 'regulatory')
    const userData = chunks.filter((c) => c.layer === 'user_data')

    // Research section
    if (research.length > 0) {
      const { text, tokens, chunkSources } = this._formatChunkSection(
        'Research Knowledge',
        research,
        tokenBudget - tokensUsed,
      )
      if (text) {
        sections.push(text)
        tokensUsed += tokens
        sources.push(...chunkSources)
      }
    }

    // Regulatory section
    if (regulatory.length > 0) {
      const { text, tokens, chunkSources } = this._formatChunkSection(
        'Regulatory & Guidelines',
        regulatory,
        tokenBudget - tokensUsed,
      )
      if (text) {
        sections.push(text)
        tokensUsed += tokens
        sources.push(...chunkSources)
      }
    }

    // User data section
    if (userData.length > 0) {
      const { text, tokens, chunkSources } = this._formatChunkSection(
        'Your Data & Survey Results',
        userData,
        tokenBudget - tokensUsed,
      )
      if (text) {
        sections.push(text)
        tokensUsed += tokens
        sources.push(...chunkSources)
      }
    }

    // Structured context (non-embedded parcel data)
    if (structuredContext) {
      const structText = this._formatStructuredContext(structuredContext)
      if (structText) {
        const structTokens = estimateTokens(structText)
        if (tokensUsed + structTokens <= tokenBudget) {
          sections.push(structText)
          tokensUsed += structTokens
        }
      }
    }

    if (sections.length === 0) {
      return { contextBlock: '', tokensUsed: 0, sources: [] }
    }

    const contextBlock = '<context>\n' + sections.join('\n\n') + '\n</context>'
    return { contextBlock, tokensUsed, sources }
  }

  private _formatChunkSection(
    title: string,
    chunks: RetrievalResult[],
    tokenBudget: number,
  ): { text: string; tokens: number; chunkSources: SourceCitation[] } {
    const lines: string[] = [`## ${title}`]
    let tokens = estimateTokens(`## ${title}\n`)
    const chunkSources: SourceCitation[] = []

    for (const chunk of chunks) {
      const line = `[Source: ${chunk.source}] (similarity: ${chunk.similarity.toFixed(2)})\n${chunk.content}`
      const lineTokens = estimateTokens(line + '\n---\n')

      if (tokens + lineTokens > tokenBudget) break

      lines.push(line)
      lines.push('---')
      tokens += lineTokens
      chunkSources.push({
        source: chunk.source,
        title: (chunk.metadata['title'] as string) ?? chunk.source,
        layer: chunk.layer,
        similarity: chunk.similarity,
      })
    }

    if (lines.length <= 1) {
      return { text: '', tokens: 0, chunkSources: [] }
    }

    return { text: lines.join('\n'), tokens, chunkSources }
  }

  private _formatStructuredContext(ctx: StructuredContext): string {
    const parts: string[] = ['## Current Parcel Data']

    if (ctx.parcelInfo) {
      const p = ctx.parcelInfo
      parts.push(
        `**Parcel:** ${p['name'] ?? 'Unknown'} | ${p['area_hectares'] ?? '?'} ha | ` +
        `${p['municipality'] ?? ''}, ${p['county'] ?? ''}`.replace(/,\s*$/, ''),
      )
    }

    if (ctx.latestSatellite) {
      const s = ctx.latestSatellite
      const indexData = s['index_data'] as Record<string, unknown> | undefined
      parts.push(
        `**Latest satellite:** ${s['source'] ?? 'unknown'} on ${s['acquisition_date'] ?? 'unknown'} ` +
        `| Cloud: ${s['cloud_cover_percent'] ?? '?'}%` +
        (indexData?.['ndvi_mean'] ? ` | NDVI mean: ${indexData['ndvi_mean']}` : ''),
      )
    }

    if (ctx.recentAnalysis && (ctx.recentAnalysis as unknown[]).length > 0) {
      parts.push('**Recent analyses:**')
      for (const a of ctx.recentAnalysis as Record<string, unknown>[]) {
        parts.push(
          `- ${a['module']} (${a['status']}) completed ${a['completed_at'] ?? '?'} ` +
          `| confidence: ${a['confidence_score'] ?? 'n/a'}`,
        )
      }
    }

    if (parts.length <= 1) return ''
    return parts.join('\n')
  }

  private _getIntentInstructions(intent: string): string {
    switch (intent) {
      case 'regulatory_lookup':
        return (
          '## Special Instructions for Regulatory Questions\n' +
          'The user is asking about regulations or guidelines. Cite the specific regulation, ' +
          'section, and jurisdiction. Always recommend they verify with Skogsstyrelsen or ' +
          'their local authority for binding guidance.'
        )
      case 'scenario_request':
        return (
          '## Special Instructions for Scenario Analysis\n' +
          'The user wants to explore a scenario. Be clear about assumptions, note limitations ' +
          'of the analysis, and distinguish between modelled projections and observed data.'
        )
      case 'data_request':
        return (
          '## Special Instructions for Data Requests\n' +
          'The user wants to see their data. Summarise the relevant metrics, note the data ' +
          'date, and offer to explain any concerning trends.'
        )
      case 'analysis_question':
        return (
          '## Special Instructions for Analysis Questions\n' +
          'The user is asking about analysis results. Reference the specific survey and module, ' +
          'note the confidence score, and explain what the results mean in practical terms.'
        )
      default:
        return ''
    }
  }

  /**
   * Trim conversation history to fit within the remaining token budget.
   * Always keeps the most recent messages, dropping oldest first.
   */
  private _trimHistory(
    history: Message[],
    tokenBudget: number,
  ): Message[] {
    // Filter to user/assistant roles only, take last MAX_HISTORY_TURNS
    const eligible = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-MAX_HISTORY_TURNS)

    // Start from the end (most recent) and add messages until budget runs out
    const result: Message[] = []
    let usedTokens = 0

    for (let i = eligible.length - 1; i >= 0; i--) {
      const msg = eligible[i]!
      const msgTokens = estimateTokens(msg.content)
      if (usedTokens + msgTokens > tokenBudget) break
      result.unshift(msg)
      usedTokens += msgTokens
    }

    return result
  }
}
