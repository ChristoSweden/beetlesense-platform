import { getSupabaseAdmin } from '../../lib/supabase.js'
import { logger } from '../../lib/logger.js'
import type { CuratedNewsItem } from '../websearch/newsAggregator.js'

// ─── Types ───

export interface BlogPostData {
  title_en: string
  title_sv: string
  summary_en: string
  summary_sv: string
  body_en: string
  body_sv: string
  tags: string[]
  featured_image_prompt: string
  sources: BlogSource[]
  status: 'draft' | 'published'
  generated_at: string
}

export interface BlogSource {
  title: string
  url: string
  source: string
}

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{ type: 'text'; text: string }>
}

// ─── Service ───

export class BlogGeneratorService {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env['ANTHROPIC_API_KEY'] ?? ''
    this.model = process.env['BLOG_CLAUDE_MODEL'] ?? 'claude-sonnet-4-20250514'
  }

  /**
   * Generate a blog post from curated news items and optional knowledge base content.
   */
  async generateBlogPost(
    newsItems: CuratedNewsItem[],
    knowledgeContext?: string,
  ): Promise<BlogPostData> {
    if (newsItems.length === 0) {
      throw new Error('No news items provided for blog generation')
    }

    logger.info(
      { newsCount: newsItems.length, hasKnowledge: !!knowledgeContext },
      'Generating blog post',
    )

    // Build the prompt with news context
    const newsContext = newsItems
      .map(
        (item, i) =>
          `[${i + 1}] "${item.title}" (${item.source}, ${item.publishedDate ?? 'recent'})\n` +
          `    ${item.snippet}\n` +
          `    URL: ${item.url}\n` +
          `    Category: ${item.category}`,
      )
      .join('\n\n')

    const systemPrompt = `You are the BeetleSense Forest Intelligence Report writer. You produce professional, data-driven blog posts about forestry, bark beetle outbreaks, forest health, and related topics for the Swedish and European forestry market.

Your tone is professional but accessible. You cite sources. You provide actionable insights for forest owners.

You MUST respond with a valid JSON object (no markdown fences) with these exact keys:
{
  "title_en": "English title",
  "title_sv": "Swedish title",
  "summary_en": "2-3 sentence English summary",
  "summary_sv": "2-3 sentence Swedish summary",
  "body_en": "Full English article in markdown (800-1200 words)",
  "body_sv": "Full Swedish article in markdown (800-1200 words)",
  "tags": ["tag1", "tag2", "tag3"],
  "featured_image_prompt": "A detailed prompt for generating a featured image"
}`

    const userContent = `Based on the following curated forestry news and research, write today's BeetleSense Forest Intelligence Report blog post.

## News Sources

${newsContext}

${knowledgeContext ? `## Additional Research Context\n\n${knowledgeContext}` : ''}

## Instructions

- Synthesize the top stories into a cohesive narrative
- Include source citations using [N] notation matching the source numbers above
- Focus on what matters to Swedish forest owners
- Include practical recommendations where applicable
- Write in both English and Swedish
- Generate appropriate tags for the post
- Create a featured image prompt that would represent the main theme`

    const messages: ClaudeMessage[] = [{ role: 'user', content: userContent }]

    const response = await this.callClaude(systemPrompt, messages)
    const parsed = this.parseResponse(response)

    // Attach sources
    parsed.sources = newsItems.map((item) => ({
      title: item.title,
      url: item.url,
      source: item.source,
    }))

    parsed.status = 'draft'
    parsed.generated_at = new Date().toISOString()

    return parsed
  }

  /**
   * Store a generated blog post in Supabase.
   */
  async storeBlogPost(post: BlogPostData): Promise<string> {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title_en: post.title_en,
        title_sv: post.title_sv,
        summary_en: post.summary_en,
        summary_sv: post.summary_sv,
        body_en: post.body_en,
        body_sv: post.body_sv,
        tags: post.tags,
        featured_image_prompt: post.featured_image_prompt,
        sources: post.sources,
        status: post.status,
        generated_at: post.generated_at,
        published_at: post.status === 'published' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to store blog post: ${error.message}`)
    }

    logger.info({ postId: data.id, title: post.title_en }, 'Blog post stored')
    return data.id
  }

  /**
   * Publish a draft blog post.
   */
  async publishPost(postId: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) {
      throw new Error(`Failed to publish blog post ${postId}: ${error.message}`)
    }

    logger.info({ postId }, 'Blog post published')
  }

  // ─── Claude API ───

  private async callClaude(
    systemPrompt: string,
    messages: ClaudeMessage[],
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as ClaudeResponse
    return data.content[0]?.text ?? ''
  }

  private parseResponse(text: string): BlogPostData {
    // Strip markdown code fences if present
    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    try {
      const parsed = JSON.parse(cleaned) as Partial<BlogPostData>

      return {
        title_en: parsed.title_en ?? 'BeetleSense Forest Intelligence Report',
        title_sv: parsed.title_sv ?? 'BeetleSense Skogsintelligensrapport',
        summary_en: parsed.summary_en ?? '',
        summary_sv: parsed.summary_sv ?? '',
        body_en: parsed.body_en ?? '',
        body_sv: parsed.body_sv ?? '',
        tags: parsed.tags ?? [],
        featured_image_prompt: parsed.featured_image_prompt ?? '',
        sources: [],
        status: 'draft',
        generated_at: new Date().toISOString(),
      }
    } catch {
      logger.error({ textLength: text.length }, 'Failed to parse Claude blog response as JSON')
      throw new Error('Failed to parse blog generation response')
    }
  }
}
