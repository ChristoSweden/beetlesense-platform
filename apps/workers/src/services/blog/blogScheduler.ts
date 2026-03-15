import { getSupabaseAdmin } from '../../lib/supabase.js'
import { logger } from '../../lib/logger.js'
import { BlogGeneratorService } from './blogGenerator.js'
import type { CuratedNewsItem, NewsCategory } from '../websearch/newsAggregator.js'

// ─── Types ───

export interface DailyBlogConfig {
  /** Minimum number of news items required to generate a post */
  minNewsItems: number
  /** Maximum number of news items to include in the post */
  maxNewsItems: number
  /** Whether to auto-publish or leave as draft */
  autoPublish: boolean
  /** Categories to prioritize (in order) */
  priorityCategories: NewsCategory[]
}

const DEFAULT_CONFIG: DailyBlogConfig = {
  minNewsItems: 3,
  maxNewsItems: 5,
  autoPublish: false,
  priorityCategories: [
    'BEETLE_OUTBREAKS',
    'FOREST_HEALTH',
    'CLIMATE_IMPACT',
    'REGULATIONS',
    'TECHNOLOGY',
    'MARKET_PRICES',
  ],
}

// ─── Service ───

export class BlogScheduler {
  private generator: BlogGeneratorService
  private config: DailyBlogConfig

  constructor(config?: Partial<DailyBlogConfig>) {
    this.generator = new BlogGeneratorService()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Run the daily blog generation pipeline:
   * 1. Fetch yesterday's top curated news
   * 2. Optionally fetch knowledge base research
   * 3. Generate a blog post
   * 4. Store and optionally publish
   */
  async runDailyGeneration(): Promise<string | null> {
    logger.info('Starting daily blog generation')

    // Step 1: Fetch yesterday's curated news, sorted by combined score
    const newsItems = await this.fetchRecentNews()

    if (newsItems.length < this.config.minNewsItems) {
      logger.info(
        { available: newsItems.length, required: this.config.minNewsItems },
        'Not enough curated news for daily blog — skipping',
      )
      return null
    }

    // Take top N items
    const topStories = newsItems.slice(0, this.config.maxNewsItems)

    logger.info(
      { storyCount: topStories.length, categories: [...new Set(topStories.map((s) => s.category))] },
      'Selected stories for daily blog',
    )

    // Step 2: Fetch relevant knowledge base context (if available)
    const knowledgeContext = await this.fetchKnowledgeContext(topStories)

    // Step 3: Generate the blog post
    const post = await this.generator.generateBlogPost(topStories, knowledgeContext ?? undefined)

    // Step 4: Store
    const postId = await this.generator.storeBlogPost(post)

    // Step 5: Auto-publish if configured
    if (this.config.autoPublish) {
      await this.generator.publishPost(postId)
      logger.info({ postId }, 'Daily blog post auto-published')
    } else {
      logger.info({ postId }, 'Daily blog post saved as draft')
    }

    return postId
  }

  /**
   * Check if a blog post has already been generated today.
   * Prevents duplicate generation.
   */
  async hasGeneratedToday(): Promise<boolean> {
    const supabase = getSupabaseAdmin()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .gte('generated_at', todayStart.toISOString())

    if (error) {
      logger.warn({ error: error.message }, 'Failed to check for existing daily post')
      return false
    }

    return (count ?? 0) > 0
  }

  // ─── Data fetching ───

  private async fetchRecentNews(): Promise<CuratedNewsItem[]> {
    const supabase = getSupabaseAdmin()

    // Fetch news from the last 24 hours, sorted by combined score
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('curated_news')
      .select('*')
      .gte('curated_at', yesterday)
      .order('combined_score', { ascending: false })
      .limit(20)

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch curated news')
      return []
    }

    return (data ?? []).map((row) => ({
      title: row.title as string,
      snippet: row.snippet as string,
      url: row.url as string,
      publishedDate: row.published_date as string | null,
      source: row.source as string,
      relevanceScore: row.relevance_score as number,
      recencyScore: row.recency_score as number,
      combinedScore: row.combined_score as number,
      category: row.category as NewsCategory,
    }))
  }

  private async fetchKnowledgeContext(
    stories: CuratedNewsItem[],
  ): Promise<string | null> {
    const supabase = getSupabaseAdmin()

    // Fetch any recent research papers or KB entries that relate to the story categories
    const categories = [...new Set(stories.map((s) => s.category))]
    const tags = categories.map((c) => c.toLowerCase().replace('_', ' '))

    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('title, summary, source_url')
      .or(tags.map((t) => `tags.cs.{${t}}`).join(','))
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data || data.length === 0) {
      return null
    }

    return data
      .map(
        (doc) =>
          `- "${doc.title}": ${doc.summary ?? 'No summary available'}${doc.source_url ? ` (${doc.source_url})` : ''}`,
      )
      .join('\n')
  }
}
