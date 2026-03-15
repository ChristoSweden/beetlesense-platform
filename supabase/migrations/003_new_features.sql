-- ============================================================
-- BeetleSense.ai — New Features Migration
-- 003_new_features.sql
-- Web Search, Curated News, Blog Posts, Vision Identifications
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Web Search Results (raw search cache)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.web_search_results (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  query         text NOT NULL,
  provider      text NOT NULL DEFAULT 'brave',
  url           text NOT NULL,
  title         text NOT NULL,
  snippet       text,
  published_at  timestamptz,
  raw_payload   jsonb,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_web_search_url UNIQUE (url)
);

CREATE INDEX idx_web_search_fetched ON public.web_search_results (fetched_at DESC);
CREATE INDEX idx_web_search_query   ON public.web_search_results USING gin (to_tsvector('simple', query || ' ' || title));

-- ────────────────────────────────────────────────────────────
-- 2. Curated News (processed & categorised articles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.curated_news (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source_url      text NOT NULL,
  title           text NOT NULL,
  summary         text,
  category        text NOT NULL DEFAULT 'general',
  relevance_score real NOT NULL DEFAULT 0,
  recency_score   real NOT NULL DEFAULT 0,
  combined_score  real NOT NULL DEFAULT 0,
  image_url       text,
  language        text NOT NULL DEFAULT 'en',
  published_at    timestamptz,
  expires_at      timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_curated_news_url UNIQUE (source_url)
);

CREATE INDEX idx_curated_news_category ON public.curated_news (category, combined_score DESC);
CREATE INDEX idx_curated_news_created  ON public.curated_news (created_at DESC);
CREATE INDEX idx_curated_news_expires  ON public.curated_news (expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER set_curated_news_updated_at
  BEFORE UPDATE ON public.curated_news
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. Blog Posts (auto-generated daily articles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug          text NOT NULL,
  title_en      text NOT NULL,
  title_sv      text NOT NULL,
  summary_en    text,
  summary_sv    text,
  content_en    text NOT NULL,
  content_sv    text NOT NULL,
  category      text NOT NULL DEFAULT 'forest-health',
  tags          text[] DEFAULT '{}',
  cover_image   text,
  sources       jsonb DEFAULT '[]',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at  timestamptz,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_blog_slug UNIQUE (slug)
);

CREATE INDEX idx_blog_status     ON public.blog_posts (status, published_at DESC);
CREATE INDEX idx_blog_category   ON public.blog_posts (category);
CREATE INDEX idx_blog_tags       ON public.blog_posts USING gin (tags);
CREATE INDEX idx_blog_slug       ON public.blog_posts (slug);

CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. Vision Identifications (phone camera species/disease ID)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.identifications (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path      text NOT NULL,
  thumbnail_path  text,
  location        extensions.geometry(Point, 3006),
  latitude        double precision,
  longitude       double precision,

  -- Classification results
  category        text NOT NULL DEFAULT 'unknown' CHECK (category IN ('tree', 'animal', 'plant', 'disease', 'insect', 'unknown')),
  species_name    text,
  common_name_en  text,
  common_name_sv  text,
  confidence      real NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  top_candidates  jsonb DEFAULT '[]',

  -- Disease-specific
  disease_name    text,
  severity        text CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),

  -- Model metadata
  model_version   text,
  inference_ms    integer,
  raw_output      jsonb,

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_identifications_user     ON public.identifications (user_id, created_at DESC);
CREATE INDEX idx_identifications_category ON public.identifications (category);
CREATE INDEX idx_identifications_species  ON public.identifications (species_name) WHERE species_name IS NOT NULL;
CREATE INDEX idx_identifications_location ON public.identifications USING gist (location) WHERE location IS NOT NULL;

CREATE TRIGGER set_identifications_updated_at
  BEFORE UPDATE ON public.identifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────────────────────

-- Web search results: read-only for authenticated users
ALTER TABLE public.web_search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read web search results"
  ON public.web_search_results FOR SELECT
  TO authenticated
  USING (true);

-- Curated news: read-only for authenticated users
ALTER TABLE public.curated_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read curated news"
  ON public.curated_news FOR SELECT
  TO authenticated
  USING (true);

-- Blog posts: published posts are public, all visible to authenticated
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Identifications: users can only see their own
ALTER TABLE public.identifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own identifications"
  ON public.identifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own identifications"
  ON public.identifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own identifications"
  ON public.identifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own identifications"
  ON public.identifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant service role full access for worker processes
GRANT ALL ON public.web_search_results TO service_role;
GRANT ALL ON public.curated_news TO service_role;
GRANT ALL ON public.blog_posts TO service_role;
GRANT ALL ON public.identifications TO service_role;
