/**
 * Safety guardrails and quality checks for the BeetleSense companion.
 *
 * - Domain relevance filtering
 * - Prompt injection detection
 * - Response validation (citation checking)
 * - Confidence scoring
 * - Disclaimer generation
 */

import type { SourceCitation } from './retrievalService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface GuardrailCheckResult {
  allowed: boolean
  reason?: string
  suggestedResponse?: string
}

export interface ConfidenceResult {
  level: ConfidenceLevel
  score: number
  breakdown: {
    retrievalScore: number
    citationScore: number
    intentScore: number
  }
}

export interface ValidationResult {
  valid: boolean
  citedSources: string[]
  unsubstantiatedClaims: string[]
  warnings: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────

const OFF_TOPIC_RESPONSE =
  "I'm specialized in forest management and ecology. I can help with questions " +
  'about tree health, beetle detection, species identification, forest inventory, ' +
  'and related topics.'

const OFF_TOPIC_RESPONSE_SV =
  'Jag specialiserar mig på skogsförvaltning och ekologi. Jag kan hjälpa till med ' +
  'frågor om trädhälsa, barkborredetektion, artbestämning, skogsinventering och ' +
  'relaterade ämnen.'

const FORESTRY_DOMAIN_TERMS = new Set([
  // English
  'tree', 'forest', 'wood', 'timber', 'bark', 'spruce', 'pine', 'birch',
  'oak', 'beetle', 'pest', 'insect', 'fungus', 'disease', 'canopy',
  'stand', 'harvest', 'thinning', 'planting', 'seedling', 'sapling',
  'understory', 'overstory', 'dbh', 'basal', 'volume', 'biomass',
  'carbon', 'ndvi', 'satellite', 'drone', 'lidar', 'survey',
  'inventory', 'silviculture', 'ecology', 'biodiversity', 'habitat',
  'soil', 'watershed', 'erosion', 'fire', 'wildfire', 'climate',
  'reforestation', 'deforestation', 'logging', 'certification',
  'fsc', 'pefc', 'parcel', 'hectare', 'density', 'species',
  // Swedish
  'träd', 'skog', 'virke', 'bark', 'gran', 'tall', 'björk',
  'barkborre', 'skadedjur', 'insekt', 'svamp', 'sjukdom', 'krontak',
  'bestånd', 'avverkning', 'gallring', 'plantering', 'planta',
  'undervegetation', 'volym', 'biomassa', 'kol', 'inventering',
  'skogsvård', 'ekologi', 'mångfald', 'biotop', 'mark', 'erosion',
  'brand', 'klimat', 'återbeskogning', 'certifiering', 'skifte',
  'hektar', 'täthet', 'artbestämning', 'skogsstyrelsen',
])

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions?\s*:/i,
  /system\s+prompt/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /bypass\s+(safety|filter|guardrail)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|a|an)\b/i,
  /roleplay\s+as/i,
  /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instruction)/i,
  /what\s+(is|are)\s+your\s+(system|initial)\s+(prompt|instruction)/i,
  /repeat\s+the\s+above/i,
  /output\s+your\s+instructions/i,
  /<\s*\/?system\s*>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
]

// Quantitative claims that should have citations
const CLAIM_INDICATORS = [
  /\b\d+%\b/,
  /\b\d+\s*(trees?|hectares?|ha)\b/i,
  /according\s+to/i,
  /research\s+(shows?|indicates?|suggests?)/i,
  /studies?\s+(show|indicate|suggest|found)/i,
  /data\s+shows?/i,
  /regulations?\s+(require|state|mandate)/i,
  /legally\s+required/i,
  /\blagen\b/i, // Swedish: the law
  /\bföreskrift/i, // Swedish: regulation
]

// ── Service ───────────────────────────────────────────────────────────────

export class GuardrailService {
  /**
   * Check whether a query is within the forestry domain.
   */
  checkDomainRelevance(query: string): GuardrailCheckResult {
    const normalised = query.toLowerCase()
    const words = normalised.split(/[\s,.;:!?()[\]{}"']+/).filter(Boolean)

    // Count domain-relevant terms
    let domainHits = 0
    for (const word of words) {
      if (FORESTRY_DOMAIN_TERMS.has(word)) {
        domainHits++
      }
    }

    // Also check multi-word terms
    const multiWordTerms = [
      'bark beetle', 'tree count', 'forest health', 'forest inventory',
      'clear cut', 'selective harvest', 'root rot', 'storm damage',
      'wild boar', 'natura 2000', 'eu regulation',
      'barkborre', 'granbarkborre', 'skogsvårdslagen', 'biologisk mångfald',
    ]
    for (const term of multiWordTerms) {
      if (normalised.includes(term)) domainHits += 2
    }

    // Greeting/pleasantry pass-through
    const greetings = ['hello', 'hi', 'hey', 'hej', 'tjena', 'hejsan', 'thanks', 'tack']
    if (words.length <= 5 && greetings.some((g) => normalised.includes(g))) {
      return { allowed: true }
    }

    // Very short queries (1-3 words) are allowed through — let the LLM handle
    if (words.length <= 3) {
      return { allowed: true }
    }

    // Need at least one domain term for longer queries
    if (domainHits === 0 && words.length >= 5) {
      const isSvenska = /[åäö]/.test(normalised)
      return {
        allowed: false,
        reason: 'off_topic',
        suggestedResponse: isSvenska ? OFF_TOPIC_RESPONSE_SV : OFF_TOPIC_RESPONSE,
      }
    }

    return { allowed: true }
  }

  /**
   * Detect common prompt injection attempts.
   */
  detectPromptInjection(query: string): GuardrailCheckResult {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        return {
          allowed: false,
          reason: 'prompt_injection_detected',
          suggestedResponse:
            "I'm here to help with forestry questions. Could you rephrase your question?",
        }
      }
    }

    // Check for suspiciously long base64 or encoded strings
    const base64Chunks = query.match(/[A-Za-z0-9+/=]{100,}/g)
    if (base64Chunks && base64Chunks.length > 0) {
      return {
        allowed: false,
        reason: 'suspicious_encoded_content',
        suggestedResponse:
          'Please ask your question in plain text. I can help with forestry-related queries.',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate that a generated response has proper citations for claims.
   */
  validateResponse(
    response: string,
    sources: SourceCitation[],
  ): ValidationResult {
    const citedSources: string[] = []
    const warnings: string[] = []
    const unsubstantiatedClaims: string[] = []

    // Extract cited sources from response
    const citations = response.matchAll(/\[Source:\s*([^\]]+)\]/gi)
    for (const match of citations) {
      citedSources.push(match[1]!.trim())
    }

    // Check if quantitative claims have associated citations
    const sentences = response.split(/(?<=[.!?])\s+/)
    for (const sentence of sentences) {
      const hasClaim = CLAIM_INDICATORS.some((p) => p.test(sentence))
      if (hasClaim) {
        const hasCitation = /\[Source:\s*[^\]]+\]/i.test(sentence)
        // Also check if next sentence has citation (common pattern)
        if (!hasCitation) {
          unsubstantiatedClaims.push(
            sentence.length > 100 ? sentence.slice(0, 100) + '...' : sentence,
          )
        }
      }
    }

    // Warn if response cites sources not in retrieved set
    const availableSourceNames = new Set(sources.map((s) => s.source.toLowerCase()))
    for (const cited of citedSources) {
      if (!availableSourceNames.has(cited.toLowerCase())) {
        // Check if it's a partial match
        const isPartialMatch = [...availableSourceNames].some(
          (s) => s.includes(cited.toLowerCase()) || cited.toLowerCase().includes(s),
        )
        if (!isPartialMatch) {
          warnings.push(`Cited source "${cited}" not found in retrieved context`)
        }
      }
    }

    if (unsubstantiatedClaims.length > 3) {
      warnings.push(
        `${unsubstantiatedClaims.length} quantitative claims without inline citations`,
      )
    }

    return {
      valid: warnings.length === 0,
      citedSources,
      unsubstantiatedClaims,
      warnings,
    }
  }

  /**
   * Compute a confidence level from retrieval quality, citation coverage,
   * and intent classification confidence.
   *
   * Weights: retrieval similarity (0.4) + citation coverage (0.4) + intent (0.2)
   */
  computeConfidence(
    retrievalScores: number[],
    citationCount: number,
    intentConfidence: number,
  ): ConfidenceResult {
    // Retrieval score: average similarity of top results
    const retrievalScore =
      retrievalScores.length > 0
        ? retrievalScores.reduce((a, b) => a + b, 0) / retrievalScores.length
        : 0

    // Citation score: log scale, 3+ citations = 1.0
    const citationScore = Math.min(1.0, citationCount / 3)

    // Weighted sum
    const raw =
      retrievalScore * 0.4 +
      citationScore * 0.4 +
      intentConfidence * 0.2

    const score = Math.max(0, Math.min(1, raw))

    let level: ConfidenceLevel
    if (score >= 0.7) level = 'high'
    else if (score >= 0.4) level = 'medium'
    else level = 'low'

    return {
      level,
      score,
      breakdown: {
        retrievalScore,
        citationScore,
        intentScore: intentConfidence,
      },
    }
  }

  /**
   * Append disclaimers to the response based on confidence level and intent.
   */
  addDisclaimers(
    response: string,
    confidence: ConfidenceLevel,
    intent: string,
  ): string {
    const disclaimers: string[] = []

    // Regulatory disclaimer
    if (intent === 'regulatory_lookup') {
      disclaimers.push(
        '---\n' +
        '*This information is for guidance only and does not constitute legal advice. ' +
        'Please consult Skogsstyrelsen or a certified forestry advisor for binding regulatory guidance.*',
      )
    }

    // Low confidence disclaimer
    if (confidence === 'low') {
      disclaimers.push(
        '---\n' +
        '*Note: This response has lower confidence due to limited matching sources. ' +
        'Consider verifying the information independently or providing more details in your question.*',
      )
    }

    // Medium confidence with scenario/analysis intent
    if (
      confidence === 'medium' &&
      (intent === 'scenario_request' || intent === 'analysis_question')
    ) {
      disclaimers.push(
        '---\n' +
        '*Some details in this response are based on general knowledge rather than ' +
        'your specific data. Results may vary for your particular conditions.*',
      )
    }

    if (disclaimers.length === 0) return response
    return response + '\n\n' + disclaimers.join('\n\n')
  }
}
