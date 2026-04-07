-- ═══════════════════════════════════════════════════════════════════════════
-- parcel_wiki — LLM-maintained per-parcel knowledge wiki (Karpathy pattern)
--
-- Instead of re-deriving knowledge from raw docs on every query, the AI
-- incrementally builds and maintains a structured wiki for each parcel.
-- Pages are created from surveys, alerts, observations, and high-confidence
-- companion answers. The companion reads the wiki first, then RAG.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Main wiki pages table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parcel_wiki (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id    UUID        NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification
  slug         TEXT        NOT NULL,  -- e.g. "bark-beetle-risk", "ndvi-trend-2025-q2"
  title        TEXT        NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN (
                 'health', 'threat', 'observation', 'plan',
                 'financial', 'regulatory', 'insight', 'index', 'log'
               )),

  -- Content (markdown, LLM-authored)
  content      TEXT        NOT NULL DEFAULT '',

  -- Provenance
  source_type  TEXT        NOT NULL DEFAULT 'ai_generated' CHECK (source_type IN (
                 'ai_generated',    -- LLM built from surveys/alerts
                 'survey_compiled', -- compiled directly from a survey result
                 'query_filed',     -- a high-confidence companion answer filed back
                 'user_authored'    -- human-written
               )),
  source_ids   UUID[]      NOT NULL DEFAULT '{}',  -- survey/alert/message IDs that seeded this page

  -- Cross-references (wiki linking)
  related_slugs TEXT[]     NOT NULL DEFAULT '{}',
  tags          TEXT[]     NOT NULL DEFAULT '{}',

  -- Metrics
  inbound_links INTEGER    NOT NULL DEFAULT 0,
  view_count    INTEGER    NOT NULL DEFAULT 0,

  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vector embedding for semantic search (Google text-embedding-004, 768-dim)
  embedding    vector(768),

  -- One slug per parcel (slugs are parcel-scoped)
  UNIQUE (parcel_id, slug)
);

-- ── Wiki index (one per parcel) ─────────────────────────────────────────────
-- The index is just a special wiki page with category='index'.
-- It is maintained automatically by the wiki-ingest edge function.

-- ── Wiki log (one per parcel) ──────────────────────────────────────────────
-- The log is a special wiki page with category='log'.
-- Append-only: each ingest prepends a ## [date] entry.

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS parcel_wiki_parcel_id_idx  ON parcel_wiki (parcel_id);
CREATE INDEX IF NOT EXISTS parcel_wiki_user_id_idx    ON parcel_wiki (user_id);
CREATE INDEX IF NOT EXISTS parcel_wiki_category_idx   ON parcel_wiki (category);
CREATE INDEX IF NOT EXISTS parcel_wiki_updated_at_idx ON parcel_wiki (updated_at DESC);
CREATE INDEX IF NOT EXISTS parcel_wiki_tags_idx       ON parcel_wiki USING gin (tags);

-- Vector similarity index (IVFFlat, tuned for up to ~10k pages per deployment)
CREATE INDEX IF NOT EXISTS parcel_wiki_embedding_idx
  ON parcel_wiki USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE parcel_wiki ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wiki_select_own"
  ON parcel_wiki FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wiki_insert_own"
  ON parcel_wiki FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wiki_update_own"
  ON parcel_wiki FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "wiki_delete_own"
  ON parcel_wiki FOR DELETE
  USING (auth.uid() = user_id);

-- Service role (used by edge functions) bypasses RLS automatically.

-- ── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_parcel_wiki_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER parcel_wiki_updated_at
  BEFORE UPDATE ON parcel_wiki
  FOR EACH ROW EXECUTE FUNCTION update_parcel_wiki_updated_at();

-- ── RPC: semantic search over wiki pages ────────────────────────────────────

CREATE OR REPLACE FUNCTION match_parcel_wiki (
  p_parcel_id        UUID,
  query_embedding    vector(768),
  match_count        INT     DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.25
)
RETURNS TABLE (
  id            UUID,
  slug          TEXT,
  title         TEXT,
  category      TEXT,
  content       TEXT,
  source_type   TEXT,
  tags          TEXT[],
  related_slugs TEXT[],
  updated_at    TIMESTAMPTZ,
  similarity    FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pw.id,
    pw.slug,
    pw.title,
    pw.category,
    pw.content,
    pw.source_type,
    pw.tags,
    pw.related_slugs,
    pw.updated_at,
    1 - (pw.embedding <=> query_embedding) AS similarity
  FROM parcel_wiki pw
  WHERE
    pw.parcel_id = p_parcel_id
    AND pw.embedding IS NOT NULL
    AND 1 - (pw.embedding <=> query_embedding) >= similarity_threshold
    AND pw.category NOT IN ('index', 'log')  -- skip meta pages from semantic search
  ORDER BY pw.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── RPC: fetch wiki index + log pages (no embedding needed) ─────────────────

CREATE OR REPLACE FUNCTION get_parcel_wiki_meta (
  p_parcel_id UUID
)
RETURNS TABLE (
  slug       TEXT,
  title      TEXT,
  category   TEXT,
  content    TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT pw.slug, pw.title, pw.category, pw.content, pw.updated_at
  FROM parcel_wiki pw
  WHERE pw.parcel_id = p_parcel_id
    AND pw.category IN ('index', 'log')
  ORDER BY pw.category;
END;
$$;

-- ── RPC: increment view count ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_wiki_view (p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE parcel_wiki SET view_count = view_count + 1 WHERE id = p_id;
END;
$$;
