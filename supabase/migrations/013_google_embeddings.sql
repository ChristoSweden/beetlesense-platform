-- ============================================================
-- BeetleSense.ai — Migrate embeddings from OpenAI to Google
-- 013_google_embeddings.sql
--
-- Changes vector columns from 1536 dims (OpenAI text-embedding-3-small)
-- to 768 dims (Google text-embedding-004).
--
-- IMPORTANT: This migration drops all existing embedding data.
-- Re-run the embedding generation pipeline after applying.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Drop existing HNSW indexes (they reference the old dimension)
-- ────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_research_embeddings_vec;
DROP INDEX IF EXISTS idx_regulatory_embeddings_vec;
DROP INDEX IF EXISTS idx_user_data_embeddings_vec;

-- ────────────────────────────────────────────────────────────
-- 2. Alter vector columns to 768 dimensions
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.research_embeddings
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE public.regulatory_embeddings
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE public.user_data_embeddings
  ALTER COLUMN embedding TYPE vector(768);

-- ────────────────────────────────────────────────────────────
-- 3. Null out existing embeddings (incompatible dimensions)
-- ────────────────────────────────────────────────────────────

UPDATE public.research_embeddings   SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE public.regulatory_embeddings SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE public.user_data_embeddings  SET embedding = NULL WHERE embedding IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. Recreate HNSW indexes for 768-dim vectors
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_research_embeddings_vec
  ON public.research_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_regulatory_embeddings_vec
  ON public.regulatory_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_user_data_embeddings_vec
  ON public.user_data_embeddings USING hnsw (embedding vector_cosine_ops);

-- ────────────────────────────────────────────────────────────
-- 5. Update matching RPCs for new dimension
--    (Function signatures don't encode vector dimension,
--     but update comments for clarity.)
-- ────────────────────────────────────────────────────────────

COMMENT ON TABLE public.research_embeddings IS
  'RAG embeddings for forestry research papers. Model: Google text-embedding-004 (768 dims).';

COMMENT ON TABLE public.regulatory_embeddings IS
  'RAG embeddings for regulatory documents. Model: Google text-embedding-004 (768 dims).';

COMMENT ON TABLE public.user_data_embeddings IS
  'Per-user RAG embeddings. Model: Google text-embedding-004 (768 dims).';
