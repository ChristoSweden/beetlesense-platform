/**
 * Parallel RAG retrieval across research, regulatory, and user-data
 * embedding layers with reciprocal rank fusion re-ranking.
 */

import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { EmbeddingService } from '../knowledgebase/embeddingService.js'

// ── Types ─────────────────────────────────────────────────────────────────

export interface RetrievalResult {
  id: string
  content: string
  source: string
  similarity: number
  layer: 'research' | 'regulatory' | 'user_data' | 'structured'
  metadata: Record<string, unknown>
  /** Rank-fused score (computed during re-ranking) */
  fusedScore: number
}

export interface SourceCitation {
  source: string
  title: string
  layer: string
  similarity: number
}

export interface RetrievalContext {
  chunks: RetrievalResult[]
  sources: SourceCitation[]
  retrievalScores: number[]
  structuredContext: StructuredContext | null
  durationMs: number
}

export interface StructuredContext {
  latestSatellite?: Record<string, unknown> | null
  recentAnalysis?: Record<string, unknown>[] | null
  parcelInfo?: Record<string, unknown> | null
}

// ── Constants ─────────────────────────────────────────────────────────────

const RESEARCH_TOP_K = 5
const REGULATORY_TOP_K = 3
const USER_DATA_TOP_K = 5
const MIN_SIMILARITY_THRESHOLD = 0.3
const RRF_K = 60 // reciprocal rank fusion constant

// ── Service ───────────────────────────────────────────────────────────────

export class RetrievalService {
  private readonly embedder: EmbeddingService

  constructor(embedder?: EmbeddingService) {
    this.embedder = embedder ?? new EmbeddingService()
  }

  /**
   * Main retrieval function.
   *
   * 1. Embed the query
   * 2. Fan out parallel pgvector searches across all 3 tables
   * 3. Optionally fetch structured parcel context
   * 4. Merge and re-rank via reciprocal rank fusion
   */
  async retrieve(
    query: string,
    userId: string,
    parcelId?: string,
  ): Promise<RetrievalContext> {
    const start = Date.now()
    const log = logger.child({ userId, parcelId })

    // Step 1: Embed query
    const queryEmbedding = await this.embedder.embedQuery(query)

    // Step 2: Parallel vector searches
    const supabase = getSupabaseAdmin()

    const searchPromises: Promise<RetrievalResult[]>[] = [
      this._searchResearch(supabase, queryEmbedding),
      this._searchRegulatory(supabase, queryEmbedding),
      this._searchUserData(supabase, queryEmbedding, userId, parcelId ?? null),
    ]

    // Step 3: Optional structured context
    let structuredContextPromise: Promise<StructuredContext | null> =
      Promise.resolve(null)

    if (parcelId) {
      structuredContextPromise = this._fetchStructuredContext(
        supabase,
        parcelId,
        userId,
      )
    }

    const [searchResults, structuredContext] = await Promise.all([
      Promise.all(searchPromises),
      structuredContextPromise,
    ])

    const researchResults = searchResults[0] ?? []
    const regulatoryResults = searchResults[1] ?? []
    const userDataResults = searchResults[2] ?? []

    // Step 4: Merge and re-rank
    const allResults = [
      ...researchResults,
      ...regulatoryResults,
      ...userDataResults,
    ]

    const reranked = this.rerank(allResults, query)

    // Build citations
    const sources: SourceCitation[] = reranked.map((r) => ({
      source: r.source,
      title: (r.metadata['title'] as string) ?? r.source,
      layer: r.layer,
      similarity: r.similarity,
    }))

    // Deduplicate sources by source string
    const uniqueSources = Array.from(
      new Map(sources.map((s) => [s.source, s])).values(),
    )

    const retrievalScores = reranked.map((r) => r.similarity)
    const duration = Date.now() - start

    log.info(
      {
        research: researchResults.length,
        regulatory: regulatoryResults.length,
        userData: userDataResults.length,
        total: reranked.length,
        durationMs: duration,
      },
      'Retrieval complete',
    )

    return {
      chunks: reranked,
      sources: uniqueSources,
      retrievalScores,
      structuredContext,
      durationMs: duration,
    }
  }

  /**
   * Reciprocal Rank Fusion across the three retrieval layers.
   *
   * Each chunk's fused score = sum over layers of 1 / (K + rank_in_layer).
   * This naturally blends results from different sources without needing
   * comparable similarity scales.
   */
  rerank(results: RetrievalResult[], _query: string): RetrievalResult[] {
    if (results.length === 0) return []

    // Group by layer
    const byLayer = new Map<string, RetrievalResult[]>()
    for (const r of results) {
      const group = byLayer.get(r.layer) ?? []
      group.push(r)
      byLayer.set(r.layer, group)
    }

    // Sort each layer by similarity descending, assign ranks
    const rankMap = new Map<string, number>()
    for (const [_layer, layerResults] of byLayer) {
      layerResults.sort((a, b) => b.similarity - a.similarity)
      for (let rank = 0; rank < layerResults.length; rank++) {
        const id = layerResults[rank]!.id
        const existing = rankMap.get(id) ?? 0
        rankMap.set(id, existing + 1 / (RRF_K + rank + 1))
      }
    }

    // Apply fused scores
    for (const r of results) {
      r.fusedScore = rankMap.get(r.id) ?? 0
    }

    // Sort by fused score descending, then by similarity as tiebreaker
    return results
      .slice()
      .sort((a, b) => b.fusedScore - a.fusedScore || b.similarity - a.similarity)
  }

  // ── Private search methods ────────────────────────────────────────────

  private async _searchResearch(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    embedding: number[],
  ): Promise<RetrievalResult[]> {
    try {
      const { data, error } = await supabase.rpc('match_research_embeddings', {
        query_embedding: embedding,
        match_count: RESEARCH_TOP_K,
      })

      if (error) {
        logger.warn({ error: error.message }, 'Research embeddings search failed')
        return []
      }

      return (data ?? [])
        .filter((row: Record<string, unknown>) =>
          (row['similarity'] as number) >= MIN_SIMILARITY_THRESHOLD,
        )
        .map((row: Record<string, unknown>) => ({
          id: row['id'] as string,
          content: row['content'] as string,
          source: (row['source'] as string) ?? 'research',
          similarity: row['similarity'] as number,
          layer: 'research' as const,
          metadata: (row['metadata'] as Record<string, unknown>) ?? {},
          fusedScore: 0,
        }))
    } catch (err) {
      logger.error({ err }, 'Research embeddings search threw')
      return []
    }
  }

  private async _searchRegulatory(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    embedding: number[],
  ): Promise<RetrievalResult[]> {
    try {
      const { data, error } = await supabase.rpc('match_regulatory_embeddings', {
        query_embedding: embedding,
        match_count: REGULATORY_TOP_K,
      })

      if (error) {
        logger.warn({ error: error.message }, 'Regulatory embeddings search failed')
        return []
      }

      return (data ?? [])
        .filter((row: Record<string, unknown>) =>
          (row['similarity'] as number) >= MIN_SIMILARITY_THRESHOLD,
        )
        .map((row: Record<string, unknown>) => ({
          id: row['id'] as string,
          content: row['content'] as string,
          source: (row['source'] as string) ?? 'regulatory',
          similarity: row['similarity'] as number,
          layer: 'regulatory' as const,
          metadata: (row['metadata'] as Record<string, unknown>) ?? {},
          fusedScore: 0,
        }))
    } catch (err) {
      logger.error({ err }, 'Regulatory embeddings search threw')
      return []
    }
  }

  private async _searchUserData(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    embedding: number[],
    userId: string,
    parcelId: string | null,
  ): Promise<RetrievalResult[]> {
    try {
      const { data, error } = await supabase.rpc('match_user_data_embeddings', {
        query_embedding: embedding,
        match_count: USER_DATA_TOP_K,
        p_user_id: userId,
        p_parcel_id: parcelId,
      })

      if (error) {
        logger.warn({ error: error.message }, 'User data embeddings search failed')
        return []
      }

      return (data ?? [])
        .filter((row: Record<string, unknown>) =>
          (row['similarity'] as number) >= MIN_SIMILARITY_THRESHOLD,
        )
        .map((row: Record<string, unknown>) => ({
          id: row['id'] as string,
          content: row['content'] as string,
          source: (row['source'] as string) ?? 'user_data',
          similarity: row['similarity'] as number,
          layer: 'user_data' as const,
          metadata: (row['metadata'] as Record<string, unknown>) ?? {},
          fusedScore: 0,
        }))
    } catch (err) {
      logger.error({ err }, 'User data embeddings search threw')
      return []
    }
  }

  /**
   * Fetch structured (non-embedded) context: latest satellite observation,
   * recent analysis results, and parcel metadata.
   */
  private async _fetchStructuredContext(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    parcelId: string,
    _userId: string,
  ): Promise<StructuredContext> {
    const [satelliteRes, analysisRes, parcelRes] = await Promise.all([
      supabase
        .from('satellite_observations')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('acquisition_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('analysis_results')
        .select('module, status, result_data, confidence_score, completed_at')
        .eq('parcel_id', parcelId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase
        .from('parcels')
        .select('name, area_hectares, county, municipality, property_designation')
        .eq('id', parcelId)
        .maybeSingle(),
    ])

    return {
      latestSatellite: satelliteRes.data ?? null,
      recentAnalysis: analysisRes.data ?? null,
      parcelInfo: parcelRes.data ?? null,
    }
  }
}
