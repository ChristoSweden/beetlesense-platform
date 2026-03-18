-- ============================================================
-- BeetleSense.ai — Knowledge Base (RAG Embeddings)
-- 003_knowledge_base.sql
-- Vector tables for research papers, regulatory documents,
-- and per-user data embeddings used by the AI companion.
-- Requires pgvector extension (000_extensions.sql).
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Research Embeddings
--    Chunked embeddings from forestry research papers,
--    SLU publications, and scientific literature.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.research_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id    text        NOT NULL,                              -- External paper identifier
  chunk_index integer     NOT NULL,                              -- Position within the paper
  content     text        NOT NULL,                              -- Raw text chunk
  embedding   vector(1536),                                      -- OpenAI text-embedding-3-small
  metadata    jsonb       DEFAULT '{}',                          -- {title, authors, year, journal, doi}
  created_at  timestamptz DEFAULT now(),
  UNIQUE(paper_id, chunk_index)
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_research_embeddings_vec ON public.research_embeddings USING hnsw (embedding vector_cosine_ops);

-- ────────────────────────────────────────────────────────────
-- 2. Regulatory Embeddings
--    Chunked embeddings from Skogsstyrelsen regulations,
--    SJVFS, environmental laws, and certification standards.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.regulatory_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text        NOT NULL,                              -- e.g., 'sjvfs-2023-14', 'sks-2024-01'
  chunk_index integer     NOT NULL,
  content     text        NOT NULL,
  embedding   vector(1536),
  metadata    jsonb       DEFAULT '{}',                          -- {title, authority, effective_date, section}
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_embeddings_vec ON public.regulatory_embeddings USING hnsw (embedding vector_cosine_ops);

-- ────────────────────────────────────────────────────────────
-- 3. User Data Embeddings (per-customer isolated)
--    Embeddings generated from user's own survey results,
--    companion conversations, and uploaded documents.
--    CRITICAL: RLS ensures strict per-user isolation.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_data_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text        NOT NULL,                              -- e.g., 'survey_result', 'companion_chat', 'document'
  source_id   uuid,                                              -- FK to the source record
  content     text        NOT NULL,
  embedding   vector(1536),
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_data_embeddings_vec     ON public.user_data_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_user_data_embeddings_user_id ON public.user_data_embeddings(user_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.research_embeddings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_embeddings  ENABLE ROW LEVEL SECURITY;

-- Research embeddings: public knowledge base, readable by all authenticated users
CREATE POLICY "research_embeddings_select_authenticated"
  ON public.research_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Regulatory embeddings: public knowledge base, readable by all authenticated users
CREATE POLICY "regulatory_embeddings_select_authenticated"
  ON public.regulatory_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- User data embeddings: strict per-user isolation
CREATE POLICY "user_data_embeddings_select_own"
  ON public.user_data_embeddings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_data_embeddings_insert_own"
  ON public.user_data_embeddings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_data_embeddings_delete_own"
  ON public.user_data_embeddings FOR DELETE
  USING (user_id = auth.uid());
