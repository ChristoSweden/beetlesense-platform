/**
 * Query intent classification for the BeetleSense companion.
 *
 * Uses keyword matching and simple rules for fast classification (no LLM call
 * needed for most queries).  Falls back to LLM-based classification for
 * ambiguous queries via an optional callback.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type Intent =
  | 'analysis_question'
  | 'regulatory_lookup'
  | 'how_to'
  | 'scenario_request'
  | 'data_request'
  | 'general_forestry'
  | 'out_of_scope'

export interface ClassificationResult {
  intent: Intent
  confidence: number // 0.0 – 1.0
  detectedLanguage: 'en' | 'sv' | 'unknown'
  matchedKeywords: string[]
}

export type LlmClassifyFn = (query: string) => Promise<ClassificationResult>

// ── Keyword lists ─────────────────────────────────────────────────────────

const ANALYSIS_KEYWORDS_EN = [
  'tree count', 'species', 'beetle', 'bark beetle', 'ndvi', 'analysis',
  'survey result', 'detection', 'infestation', 'damage', 'boar',
  'canopy', 'drone result', 'satellite data', 'inventory',
  'forest health', 'crown', 'density', 'height', 'volume',
]

const ANALYSIS_KEYWORDS_SV = [
  'trädräkning', 'trädantal', 'artbestämning', 'barkborre', 'granbarkborre',
  'analys', 'inventering', 'resultat', 'angrepp', 'skador', 'vildsvin',
  'krontak', 'drönare', 'satellit', 'skogshälsa', 'täthet', 'höjd',
  'volym', 'beståndsdata',
]

const REGULATORY_KEYWORDS_EN = [
  'regulation', 'law', 'legal', 'guideline', 'permit', 'certification',
  'fsc', 'pefc', 'eu regulation', 'eudr', 'deforestation', 'natura 2000',
  'protected', 'habitats directive', 'compliance', 'reporting',
  'harvesting rules', 'replanting', 'environmental',
]

const REGULATORY_KEYWORDS_SV = [
  'föreskrift', 'lag', 'lagstiftning', 'riktlinje', 'tillstånd',
  'certifiering', 'skogsstyrelsen', 'skogsvårdslagen', 'naturvård',
  'avverkningsanmälan', 'hänsyn', 'biotopskydd', 'nyckelbiotop',
  'miljö', 'återplantering', 'lagkrav',
]

const HOW_TO_KEYWORDS_EN = [
  'how to', 'how do i', 'guide', 'tutorial', 'step by step',
  'best practice', 'recommend', 'should i', 'when should',
  'what is the best', 'tips', 'advice', 'method', 'technique',
  'approach', 'strategy',
]

const HOW_TO_KEYWORDS_SV = [
  'hur gör', 'hur ska', 'guide', 'steg för steg',
  'bästa praxis', 'rekommend', 'borde jag', 'när ska',
  'vad är bäst', 'tips', 'råd', 'metod', 'teknik',
  'tillvägagångssätt', 'strategi',
]

const SCENARIO_KEYWORDS_EN = [
  'what if', 'scenario', 'simulate', 'predict', 'forecast',
  'what would happen', 'estimate', 'projection', 'model',
  'if i', 'compare', 'alternative', 'impact of',
]

const SCENARIO_KEYWORDS_SV = [
  'tänk om', 'scenario', 'simulera', 'förutse', 'prognos',
  'vad händer om', 'uppskatt', 'projektion', 'modell',
  'om jag', 'jämför', 'alternativ', 'effekt av',
]

const DATA_REQUEST_KEYWORDS_EN = [
  'show me', 'my data', 'my parcel', 'my survey', 'latest',
  'current', 'recent', 'summary', 'overview', 'status',
  'report', 'statistics', 'numbers', 'dashboard',
]

const DATA_REQUEST_KEYWORDS_SV = [
  'visa', 'min data', 'mitt skifte', 'min inventering', 'senaste',
  'nuvarande', 'nyligen', 'sammanfattning', 'översikt', 'status',
  'rapport', 'statistik', 'siffror',
]

const FORESTRY_DOMAIN_KEYWORDS = [
  // English
  'tree', 'forest', 'wood', 'timber', 'bark', 'spruce', 'pine', 'birch',
  'oak', 'sylviculture', 'silviculture', 'logging', 'harvest', 'planting',
  'seedling', 'stand', 'canopy', 'undergrowth', 'deadwood', 'biodiversity',
  'soil', 'lichen', 'moss', 'fungi', 'root rot', 'windthrow', 'storm damage',
  'thinning', 'clear cut', 'selective', 'reforestation', 'afforestation',
  'carbon', 'climate', 'drought', 'fire risk', 'wildfire',
  // Swedish
  'träd', 'skog', 'virke', 'timmer', 'gran', 'tall', 'björk', 'ek',
  'skogsvård', 'avverkning', 'plantering', 'planta', 'bestånd',
  'undervegetation', 'död ved', 'biologisk mångfald', 'mark', 'lav',
  'mossa', 'svamp', 'rotröta', 'storm', 'gallring', 'kalhuggning',
  'återbeskogning', 'kol', 'klimat', 'torka', 'brandrisk', 'skogsbrand',
]

// ── Service ───────────────────────────────────────────────────────────────

export class IntentClassifier {
  private readonly llmFallback?: LlmClassifyFn

  constructor(llmFallback?: LlmClassifyFn) {
    this.llmFallback = llmFallback
  }

  /**
   * Classify a user query into an intent category.
   */
  async classify(query: string): Promise<ClassificationResult> {
    const normalised = query.toLowerCase().trim()
    const language = this._detectLanguage(normalised)

    // Score each intent
    const scores: Array<{ intent: Intent; score: number; keywords: string[] }> = [
      this._score('analysis_question', normalised, [
        ...ANALYSIS_KEYWORDS_EN,
        ...ANALYSIS_KEYWORDS_SV,
      ]),
      this._score('regulatory_lookup', normalised, [
        ...REGULATORY_KEYWORDS_EN,
        ...REGULATORY_KEYWORDS_SV,
      ]),
      this._score('how_to', normalised, [
        ...HOW_TO_KEYWORDS_EN,
        ...HOW_TO_KEYWORDS_SV,
      ]),
      this._score('scenario_request', normalised, [
        ...SCENARIO_KEYWORDS_EN,
        ...SCENARIO_KEYWORDS_SV,
      ]),
      this._score('data_request', normalised, [
        ...DATA_REQUEST_KEYWORDS_EN,
        ...DATA_REQUEST_KEYWORDS_SV,
      ]),
    ]

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score)

    const best = scores[0]!

    // If best score is zero, check if it's at least forestry-related
    if (best.score === 0) {
      const forestryMatch = this._matchesAny(normalised, FORESTRY_DOMAIN_KEYWORDS)
      if (forestryMatch.length > 0) {
        // Forestry-related but no specific intent matched
        if (forestryMatch.length >= 2) {
          return {
            intent: 'general_forestry',
            confidence: 0.5,
            detectedLanguage: language,
            matchedKeywords: forestryMatch,
          }
        }

        // Low confidence — try LLM if available
        if (this.llmFallback) {
          try {
            return await this.llmFallback(query)
          } catch {
            // LLM fallback failed — use best guess
          }
        }

        return {
          intent: 'general_forestry',
          confidence: 0.3,
          detectedLanguage: language,
          matchedKeywords: forestryMatch,
        }
      }

      // No forestry keywords at all
      if (this.llmFallback) {
        try {
          return await this.llmFallback(query)
        } catch {
          // LLM fallback failed
        }
      }

      return {
        intent: 'out_of_scope',
        confidence: 0.6,
        detectedLanguage: language,
        matchedKeywords: [],
      }
    }

    // Calculate confidence based on match count and separation from runner-up
    const runnerUp = scores[1]!
    const separation = best.score - runnerUp.score
    let confidence = Math.min(0.95, 0.4 + best.score * 0.15 + separation * 0.1)

    // Low-confidence results get LLM fallback
    if (confidence < 0.5 && this.llmFallback) {
      try {
        return await this.llmFallback(query)
      } catch {
        // Use keyword-based result
      }
    }

    // Clamp
    confidence = Math.max(0.1, Math.min(1.0, confidence))

    return {
      intent: best.intent,
      confidence,
      detectedLanguage: language,
      matchedKeywords: best.keywords,
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _score(
    intent: Intent,
    query: string,
    keywords: string[],
  ): { intent: Intent; score: number; keywords: string[] } {
    const matched = this._matchesAny(query, keywords)
    return { intent, score: matched.length, keywords: matched }
  }

  private _matchesAny(query: string, keywords: string[]): string[] {
    const matched: string[] = []
    for (const kw of keywords) {
      if (query.includes(kw)) {
        matched.push(kw)
      }
    }
    return matched
  }

  /**
   * Simple language detection: count Swedish-specific characters and keywords.
   */
  private _detectLanguage(text: string): 'en' | 'sv' | 'unknown' {
    const swedishChars = (text.match(/[åäö]/g) ?? []).length
    const swedishWords = [
      'jag', 'och', 'det', 'att', 'är', 'för', 'inte', 'med',
      'hur', 'kan', 'ska', 'vad', 'har', 'den', 'ett', 'som',
      'min', 'mitt', 'mina', 'skog', 'träd',
    ]
    const words = text.split(/\s+/)
    const swedishWordCount = words.filter((w) => swedishWords.includes(w)).length

    if (swedishChars >= 2 || swedishWordCount >= 2) return 'sv'
    if (words.length >= 3 && swedishWordCount === 0 && swedishChars === 0) return 'en'
    return 'unknown'
  }
}
