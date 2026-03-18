/**
 * knowledge-search  —  BeetleSense RAG Retrieval Endpoint.
 *
 * POST  /knowledge-search
 * Body: {
 *   query:   string,
 *   limit?:  number   (default 5, max 20),
 *   filters?: {
 *     type?:       string,        // e.g. "research_paper", "field_guide"
 *     topic_tags?: string[],      // e.g. ["bark_beetle", "silviculture"]
 *   }
 * }
 *
 * Returns top-K results from `research_embeddings` and `regulatory_embeddings`
 * tables ranked by cosine similarity (pgvector `<=>` operator).
 *
 * Response: {
 *   data: {
 *     results: SearchResult[],
 *     query:   string,
 *     count:   number,
 *   }
 * }
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";
import { generateQueryEmbedding } from "../_shared/embedding.ts";
import {
  searchKnowledgeBase,
  extractSourcesList,
  type SearchOptions,
} from "../_shared/rag.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 2000;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    await getUser(req);

    // ── Parse & validate input ───────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const { query, limit: rawLimit, filters } = body as {
      query?: string;
      limit?: number;
      filters?: { type?: string; topic_tags?: string[] };
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return err("query is required and must be a non-empty string");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return err(`query must be ${MAX_QUERY_LENGTH} characters or fewer`);
    }

    const limit = Math.min(
      Math.max(1, Math.floor(rawLimit ?? DEFAULT_LIMIT)),
      MAX_LIMIT,
    );

    // Validate filters
    if (filters) {
      if (filters.type !== undefined && typeof filters.type !== "string") {
        return err("filters.type must be a string");
      }
      if (filters.topic_tags !== undefined) {
        if (
          !Array.isArray(filters.topic_tags) ||
          !filters.topic_tags.every((t: unknown) => typeof t === "string")
        ) {
          return err("filters.topic_tags must be an array of strings");
        }
      }
    }

    // ── Generate embedding ───────────────────────────────────────────────
    const trimmedQuery = query.trim();
    const embedding = await generateQueryEmbedding(trimmedQuery);

    // ── Search knowledge base ────────────────────────────────────────────
    const supabase = createServiceClient();

    const searchOptions: SearchOptions = {
      limit,
      type: filters?.type,
      topic_tags: filters?.topic_tags,
    };

    const results = await searchKnowledgeBase(
      supabase,
      embedding,
      searchOptions,
    );

    // ── Response ─────────────────────────────────────────────────────────
    return ok({
      results: results.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        source: r.source,
        similarity: r.similarity,
        table: r.table,
        metadata: r.metadata,
      })),
      sources: extractSourcesList(results),
      query: trimmedQuery,
      count: results.length,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("knowledge-search error:", e);
    return err(message, status);
  }
});
