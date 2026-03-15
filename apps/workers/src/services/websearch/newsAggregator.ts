import { getSupabaseAdmin } from '../../lib/supabase.js'
import { logger } from '../../lib/logger.js'
import { ForestryWebSearchService, type WebSearchResult } from './searchService.js'

// ─── Types ───

export type NewsCategory =
  | 'BEETLE_OUTBREAKS'
  | 'FOREST_HEALTH'
  | 'CLIMATE_IMPACT'
  | 'REGULATIONS'
  | 'TECHNOLOGY'
  | 'MARKET_PRICES'

export interface CuratedNewsItem {
  title: string
  snippet: string
  url: string
  publishedDate: string | null
  source: string
  relevanceScore: number
  recencyScore: number
  combinedScore: number
  category: NewsCategory
}

// ─── Category query map ───

const CATEGORY_QUERIES: Record<NewsCategory, string[]> = {
  BEETLE_OUTBREAKS: [
    'bark beetle outbreak Sweden',
    'granbarkborre 2026',
    'Ips typographus Europe',
    'spruce bark beetle Scandinavia',
  ],
  FOREST_HEALTH: [
    'forest health news Scandinavia',
    'Skogsstyrelsen news',
    'forest disease Sweden',
    'tree mortality Europe',
  ],
  CLIMATE_IMPACT: [
    'climate change forests Sweden',
    'drought forest damage Scandinavia',
    'forest fire risk Sweden',
    'boreal forest climate impact',
  ],
  REGULATIONS: [
    'EU forestry regulations 2026',
    'Swedish forest policy update',
    'EU deforestation regulation',
    'forest certification news',
  ],
  TECHNOLOGY: [
    'drone forestry technology',
    'AI forest monitoring',
    'LiDAR forest inventory',
    'remote sensing forestry',
  ],
  MARKET_PRICES: [
    'timber prices Sweden',
    'softwood market Scandinavia',
    'sawmill industry news',
    'wood pellet market Europe',
  ],
}

// ─── Non-forestry filter keywords ───

const IRRELEVANT_KEYWORDS = [
  'celebrity',
  'entertainment',
  'sports scores',
  'movie review',
  'recipe',
  'horoscope',
  'dating',
  'fashion',
]

// ─── Service ───

export class ForestryNewsAggregator {
  private searchService: ForestryWebSearchService

  constructor() {
    this.searchService = new ForestryWebSearchService()
  }

  /**
   * Run scheduled searches across all forestry categories.
   * Returns curated, scored, and ranked results.
   */
  async aggregateAll(): Promise<CuratedNewsItem[]> {
    const allResults: CuratedNewsItem[] = []

    for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
      logger.info({ category, queryCount: queries.length }, 'Aggregating news for category')

      for (const query of queries) {
        try {
          const results = await this.searchService.searchCurrentEvents(query, {
            freshness: 'week',
            maxResults: 5,
          })

          const scored = results
            .filter((r) => this.isForestryRelated(r))
            .map((r) => this.scoreResult(r, category as NewsCategory))

          allResults.push(...scored)

          // Cache raw results
          await this.searchService.cacheResults(results, category, query)
        } catch (err) {
          logger.error(
            { category, query, error: err instanceof Error ? err.message : String(err) },
            'Failed to search for category',
          )
        }
      }
    }

    // Deduplicate, sort by combined score, and return
    const deduped = this.deduplicateByUrl(allResults)
    deduped.sort((a, b) => b.combinedScore - a.combinedScore)

    return deduped
  }

  /**
   * Aggregate news for a single category.
   */
  async aggregateCategory(category: NewsCategory): Promise<CuratedNewsItem[]> {
    const queries = CATEGORY_QUERIES[category]
    if (!queries) {
      logger.warn({ category }, 'Unknown news category')
      return []
    }

    const results: CuratedNewsItem[] = []

    for (const query of queries) {
      try {
        const raw = await this.searchService.searchCurrentEvents(query, {
          freshness: 'week',
          maxResults: 5,
        })

        const scored = raw
          .filter((r) => this.isForestryRelated(r))
          .map((r) => this.scoreResult(r, category))

        results.push(...scored)
        await this.searchService.cacheResults(raw, category, query)
      } catch (err) {
        logger.error(
          { category, query, error: err instanceof Error ? err.message : String(err) },
          'Failed to aggregate category',
        )
      }
    }

    const deduped = this.deduplicateByUrl(results)
    deduped.sort((a, b) => b.combinedScore - a.combinedScore)
    return deduped
  }

  /**
   * Store curated results in the Supabase curated_news table.
   */
  async storeCuratedResults(items: CuratedNewsItem[]): Promise<number> {
    const supabase = getSupabaseAdmin()
    let stored = 0

    for (const item of items) {
      const { error } = await supabase.from('curated_news').upsert(
        {
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          published_date: item.publishedDate,
          source: item.source,
          relevance_score: item.relevanceScore,
          recency_score: item.recencyScore,
          combined_score: item.combinedScore,
          category: item.category,
          curated_at: new Date().toISOString(),
        },
        { onConflict: 'url' },
      )

      if (error) {
        logger.warn({ url: item.url, error: error.message }, 'Failed to store curated news item')
      } else {
        stored++
      }
    }

    logger.info({ total: items.length, stored }, 'Curated news stored')
    return stored
  }

  // ─── Scoring ───

  private scoreResult(result: WebSearchResult, category: NewsCategory): CuratedNewsItem {
    const recencyScore = this.computeRecencyScore(result.publishedDate)
    const combinedScore = result.relevanceScore * 0.6 + recencyScore * 0.4

    return {
      ...result,
      recencyScore,
      combinedScore,
      category,
    }
  }

  private computeRecencyScore(publishedDate: string | null): number {
    if (!publishedDate) return 0.3 // Unknown date gets a moderate default

    const published = new Date(publishedDate).getTime()
    if (isNaN(published)) return 0.3

    const now = Date.now()
    const ageMs = now - published
    const ageDays = ageMs / (1000 * 60 * 60 * 24)

    if (ageDays <= 1) return 1.0
    if (ageDays <= 3) return 0.9
    if (ageDays <= 7) return 0.7
    if (ageDays <= 14) return 0.5
    if (ageDays <= 30) return 0.3
    return 0.1
  }

  // ─── Filtering ───

  private isForestryRelated(result: WebSearchResult): boolean {
    const text = `${result.title} ${result.snippet}`.toLowerCase()

    // Reject if irrelevant keywords dominate
    for (const keyword of IRRELEVANT_KEYWORDS) {
      if (text.includes(keyword)) return false
    }

    // Must contain at least one forestry-related keyword
    const forestryKeywords = [
      'forest', 'tree', 'bark beetle', 'timber', 'wood', 'spruce',
      'pine', 'birch', 'skog', 'trä', 'granbarkborre', 'virke',
      'LiDAR', 'deforestation', 'biodiversity', 'habitat',
      'climate', 'drought', 'wildfire', 'sawmill', 'pellet',
      'certification', 'FSC', 'PEFC', 'regulation', 'Skogsstyrelsen',
      'Lantmäteriet', 'inventory', 'canopy', 'boreal',
    ]

    return forestryKeywords.some((kw) => text.includes(kw.toLowerCase()))
  }

  // ─── Helpers ───

  private deduplicateByUrl(items: CuratedNewsItem[]): CuratedNewsItem[] {
    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
  }
}
