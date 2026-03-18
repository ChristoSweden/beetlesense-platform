/**
 * Shared RAG (Retrieval-Augmented Generation) helper for BeetleSense Edge Functions.
 *
 * Searches both `research_embeddings` and `regulatory_embeddings` tables using
 * pgvector cosine distance, combines results, and formats them for LLM context.
 *
 * Usage:
 *   import { searchKnowledgeBase, formatResultsForLLM } from "../_shared/rag.ts";
 *   const results = await searchKnowledgeBase(supabase, embedding, { limit: 5 });
 *   const context = formatResultsForLLM(results);
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Maximum number of combined results to return. Default: 5 */
  limit?: number;
  /** Filter by metadata type (e.g. "research_paper", "field_guide") */
  type?: string;
  /** Filter by topic tags (e.g. ["bark_beetle", "silviculture"]) */
  topic_tags?: string[];
  /** Minimum similarity score (0–1). Results below this are discarded. Default: 0.3 */
  similarity_threshold?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  title: string;
  similarity: number;
  table: "research" | "regulatory";
  metadata: Record<string, unknown>;
}

// ── Core search ────────────────────────────────────────────────────────────

/**
 * Query both research and regulatory embedding tables via pgvector
 * cosine distance (`<=>`), merge results, and return the top-K by
 * descending similarity.
 */
export async function searchKnowledgeBase(
  supabase: SupabaseClient,
  embedding: number[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    limit = 5,
    type,
    topic_tags,
    similarity_threshold = 0.3,
  } = options;

  // Fetch from both tables in parallel.
  // We request more than `limit` from each table so we have a good pool to
  // merge and rank from.
  const perTableLimit = Math.max(limit, 10);

  const [researchRes, regulatoryRes] = await Promise.all([
    supabase.rpc("match_research_embeddings_filtered", {
      query_embedding: embedding,
      match_count: perTableLimit,
      similarity_threshold,
      filter_type: type ?? null,
      filter_tags: topic_tags && topic_tags.length > 0 ? topic_tags : null,
    }),
    supabase.rpc("match_regulatory_embeddings_filtered", {
      query_embedding: embedding,
      match_count: perTableLimit,
      similarity_threshold,
      filter_type: type ?? null,
      filter_tags: topic_tags && topic_tags.length > 0 ? topic_tags : null,
    }),
  ]);

  // If filtered RPCs don't exist yet, fall back to the unfiltered ones that
  // companion-chat already uses, and apply filters client-side.
  const researchData = researchRes.error
    ? await fallbackSearch(supabase, "match_research_embeddings", embedding, perTableLimit)
    : (researchRes.data ?? []);

  const regulatoryData = regulatoryRes.error
    ? await fallbackSearch(supabase, "match_regulatory_embeddings", embedding, perTableLimit)
    : (regulatoryRes.data ?? []);

  // Normalise rows into SearchResult[]
  const toResult = (
    // deno-lint-ignore no-explicit-any
    row: any,
    table: "research" | "regulatory",
  ): SearchResult => ({
    id: row.id,
    content: row.content ?? "",
    source: row.source ?? "unknown",
    title: row.title ?? row.source ?? "Untitled",
    similarity: row.similarity ?? 0,
    table,
    metadata: row.metadata ?? {},
  });

  let combined: SearchResult[] = [
    ...researchData.map((r: unknown) => toResult(r, "research")),
    ...regulatoryData.map((r: unknown) => toResult(r, "regulatory")),
  ];

  // Apply client-side filters if we fell back to unfiltered RPCs
  if (researchRes.error || regulatoryRes.error) {
    if (type) {
      combined = combined.filter(
        (r) => r.metadata?.type === type || r.source === type,
      );
    }
    if (topic_tags && topic_tags.length > 0) {
      combined = combined.filter((r) => {
        const tags = (r.metadata?.topic_tags ?? []) as string[];
        return topic_tags.some((t) => tags.includes(t));
      });
    }
  }

  // Filter by threshold and sort by descending similarity
  combined = combined
    .filter((r) => r.similarity >= similarity_threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return combined;
}

// ── Formatting for LLM context ─────────────────────────────────────────────

/**
 * Format search results as a context block for injection into the system prompt.
 *
 * Returns an empty string when there are no results so the caller can skip
 * RAG context gracefully.
 */
export function formatResultsForLLM(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map((r, i) => {
    const snippet =
      r.content.length > 600 ? r.content.slice(0, 600) + "..." : r.content;
    return (
      `[${i + 1}] ${r.title} (${r.table}, similarity: ${r.similarity.toFixed(2)})\n` +
      `Source: ${r.source}\n` +
      snippet
    );
  });

  return (
    "<knowledge_base>\n" +
    "The following excerpts were retrieved from the BeetleSense knowledge base. " +
    "Cite them using [Source: <title>] when relevant.\n\n" +
    lines.join("\n\n---\n\n") +
    "\n</knowledge_base>"
  );
}

/**
 * Extract a compact sources array suitable for returning to the client.
 */
export function extractSourcesList(
  results: SearchResult[],
): { title: string; source: string; similarity: number; table: string }[] {
  return results.map((r) => ({
    title: r.title,
    source: r.source,
    similarity: r.similarity,
    table: r.table,
  }));
}

// ── Internal helpers ───────────────────────────────────────────────────────

async function fallbackSearch(
  supabase: SupabaseClient,
  rpcName: string,
  embedding: number[],
  matchCount: number,
  // deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const { data, error } = await supabase.rpc(rpcName, {
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) {
    console.warn(`Fallback RPC ${rpcName} also failed:`, error);
    return [];
  }
  return data ?? [];
}
