/**
 * Shared embedding helper for BeetleSense Edge Functions.
 *
 * Uses Google's text-embedding-004 model (768 dimensions) via the
 * Gemini API. All knowledge base documents and queries are embedded
 * with this model for consistent similarity search.
 *
 * Usage:
 *   import { generateQueryEmbedding } from "../_shared/embedding.ts";
 *   const embedding = await generateQueryEmbedding("bark beetle detection methods");
 */

const GOOGLE_EMBEDDING_MODEL = "text-embedding-004";
const GOOGLE_EMBEDDING_DIM = 768;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Generate an embedding vector for a query string using Google's Gemini API.
 *
 * Uses `text-embedding-004` (768 dimensions) — the same model used
 * when ingesting research and regulatory documents.
 *
 * Retries once on transient failures (5xx / network).
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `models/${GOOGLE_EMBEDDING_MODEL}`,
          content: {
            parts: [{ text }],
          },
          outputDimensionality: GOOGLE_EMBEDDING_DIM,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.embedding.values as number[];
      }

      const detail = await res.text();

      // Don't retry on client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        throw new Error(
          `Google Embedding API client error (${res.status}): ${detail}`,
        );
      }

      // Server error — retry
      lastError = new Error(
        `Google Embedding API error (${res.status}): ${detail}`,
      );
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.startsWith("Google Embedding API client error")
      ) {
        throw e;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    // Wait before retrying (skip delay on last attempt)
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Google Embedding API failed after retries");
}

/** Embedding dimension — exposed for schema validation */
export const EMBEDDING_DIM = GOOGLE_EMBEDDING_DIM;
