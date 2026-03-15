import { getSupabaseAdmin } from '../../lib/supabase.js'
import { logger } from '../../lib/logger.js'

// ─── Types ───

export type SearchProvider = 'brave' | 'bing' | 'google'

export interface WebSearchResult {
  title: string
  snippet: string
  url: string
  publishedDate: string | null
  source: string
  relevanceScore: number
}

export interface SearchOptions {
  provider?: SearchProvider
  maxResults?: number
  freshness?: 'day' | 'week' | 'month'
  region?: string
}

interface BraveSearchResponse {
  web?: {
    results: Array<{
      title: string
      description: string
      url: string
      page_age?: string
      meta_url?: { hostname: string }
    }>
  }
}

// ─── Rate limiter ───

const DAILY_LIMIT = 100
const dailyCounters = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const entry = dailyCounters.get(today)
  const now = Date.now()

  if (!entry || now > entry.resetAt) {
    dailyCounters.clear()
    dailyCounters.set(today, {
      count: 1,
      resetAt: new Date(today + 'T23:59:59Z').getTime(),
    })
    return true
  }

  if (entry.count >= DAILY_LIMIT) {
    return false
  }

  entry.count++
  return true
}

// ─── Service ───

export class ForestryWebSearchService {
  private provider: SearchProvider
  private apiKey: string

  constructor(provider?: SearchProvider) {
    this.provider = provider ?? (process.env['WEB_SEARCH_PROVIDER'] as SearchProvider) ?? 'brave'
    this.apiKey = this.resolveApiKey()
  }

  private resolveApiKey(): string {
    switch (this.provider) {
      case 'brave':
        return process.env['BRAVE_SEARCH_API_KEY'] ?? ''
      case 'bing':
        return process.env['BING_SEARCH_API_KEY'] ?? ''
      case 'google':
        return process.env['GOOGLE_SEARCH_API_KEY'] ?? ''
      default:
        return ''
    }
  }

  /**
   * Execute a web search query and return structured results.
   */
  async searchCurrentEvents(
    query: string,
    options: SearchOptions = {},
  ): Promise<WebSearchResult[]> {
    if (!checkRateLimit()) {
      logger.warn('Web search daily rate limit reached (100/day)')
      return []
    }

    const maxResults = options.maxResults ?? 10

    switch (this.provider) {
      case 'brave':
        return this.searchBrave(query, maxResults, options.freshness)
      case 'bing':
        return this.searchBing(query, maxResults, options.freshness)
      case 'google':
        return this.searchGoogle(query, maxResults)
      default:
        throw new Error(`Unsupported search provider: ${this.provider}`)
    }
  }

  /**
   * Search for general forestry news in Scandinavia.
   */
  async searchForestryNews(): Promise<WebSearchResult[]> {
    const queries = [
      'forest health news Scandinavia',
      'Skogsstyrelsen news',
      'Swedish forestry industry news',
    ]

    const results: WebSearchResult[] = []
    for (const q of queries) {
      const batch = await this.searchCurrentEvents(q, { freshness: 'week', maxResults: 5 })
      results.push(...batch)
    }

    return this.deduplicateByUrl(results)
  }

  /**
   * Search specifically for bark beetle outbreak reports.
   */
  async searchBeetleOutbreaks(region?: string): Promise<WebSearchResult[]> {
    const regionStr = region ?? 'Sweden Scandinavia'
    const queries = [
      `bark beetle outbreak ${regionStr}`,
      `granbarkborre ${regionStr}`,
      `Ips typographus infestation ${regionStr}`,
      `spruce bark beetle damage ${regionStr}`,
    ]

    const results: WebSearchResult[] = []
    for (const q of queries) {
      const batch = await this.searchCurrentEvents(q, { freshness: 'month', maxResults: 5 })
      results.push(...batch)
    }

    return this.deduplicateByUrl(results)
  }

  /**
   * Search for forestry regulations and policy updates.
   */
  async searchRegulations(): Promise<WebSearchResult[]> {
    const queries = [
      'EU forestry regulations 2026',
      'Swedish forest policy update',
      'EU deforestation regulation',
      'Skogsstyrelsen regulations',
    ]

    const results: WebSearchResult[] = []
    for (const q of queries) {
      const batch = await this.searchCurrentEvents(q, { freshness: 'month', maxResults: 5 })
      results.push(...batch)
    }

    return this.deduplicateByUrl(results)
  }

  /**
   * Cache results in the Supabase web_search_results table, deduplicating by URL.
   */
  async cacheResults(
    results: WebSearchResult[],
    category: string,
    query: string,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    for (const result of results) {
      const { error } = await supabase.from('web_search_results').upsert(
        {
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          published_date: result.publishedDate,
          source: result.source,
          relevance_score: result.relevanceScore,
          category,
          search_query: query,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'url' },
      )

      if (error) {
        logger.warn({ url: result.url, error: error.message }, 'Failed to cache search result')
      }
    }
  }

  // ─── Provider implementations ───

  private async searchBrave(
    query: string,
    maxResults: number,
    freshness?: string,
  ): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
      text_decorations: 'false',
      search_lang: 'en',
    })
    if (freshness) {
      params.set('freshness', freshness === 'day' ? 'pd' : freshness === 'week' ? 'pw' : 'pm')
    }

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
    })

    if (!response.ok) {
      logger.error({ status: response.status }, 'Brave Search API error')
      return []
    }

    const data = (await response.json()) as BraveSearchResponse
    const webResults = data.web?.results ?? []

    return webResults.map((r, i) => ({
      title: r.title,
      snippet: r.description,
      url: r.url,
      publishedDate: r.page_age ?? null,
      source: r.meta_url?.hostname ?? new URL(r.url).hostname,
      relevanceScore: Math.max(0, 1 - i * 0.08),
    }))
  }

  private async searchBing(
    query: string,
    maxResults: number,
    freshness?: string,
  ): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
      mkt: 'en-SE',
    })
    if (freshness) {
      params.set('freshness', freshness === 'day' ? 'Day' : freshness === 'week' ? 'Week' : 'Month')
    }

    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?${params}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      },
    )

    if (!response.ok) {
      logger.error({ status: response.status }, 'Bing Search API error')
      return []
    }

    const data = (await response.json()) as {
      webPages?: {
        value: Array<{
          name: string
          snippet: string
          url: string
          dateLastCrawled?: string
          displayUrl?: string
        }>
      }
    }

    return (data.webPages?.value ?? []).map((r, i) => ({
      title: r.name,
      snippet: r.snippet,
      url: r.url,
      publishedDate: r.dateLastCrawled ?? null,
      source: r.displayUrl ? new URL(`https://${r.displayUrl.split('/')[0]}`).hostname : new URL(r.url).hostname,
      relevanceScore: Math.max(0, 1 - i * 0.08),
    }))
  }

  private async searchGoogle(
    query: string,
    maxResults: number,
  ): Promise<WebSearchResult[]> {
    const cx = process.env['GOOGLE_SEARCH_CX'] ?? ''
    const params = new URLSearchParams({
      q: query,
      key: this.apiKey,
      cx,
      num: String(Math.min(maxResults, 10)),
    })

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
    )

    if (!response.ok) {
      logger.error({ status: response.status }, 'Google Search API error')
      return []
    }

    const data = (await response.json()) as {
      items?: Array<{
        title: string
        snippet: string
        link: string
        displayLink?: string
        pagemap?: { metatags?: Array<{ 'article:published_time'?: string }> }
      }>
    }

    return (data.items ?? []).map((r, i) => ({
      title: r.title,
      snippet: r.snippet,
      url: r.link,
      publishedDate:
        r.pagemap?.metatags?.[0]?.['article:published_time'] ?? null,
      source: r.displayLink ?? new URL(r.link).hostname,
      relevanceScore: Math.max(0, 1 - i * 0.08),
    }))
  }

  // ─── Helpers ───

  private deduplicateByUrl(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set<string>()
    return results.filter((r) => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })
  }
}
