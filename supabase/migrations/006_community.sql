-- ============================================================
-- BeetleSense.ai — Community
-- 006_community.sql
-- Community posts, comments, and likes for forest owner
-- knowledge sharing and regional collaboration.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Community Posts
--    Forest owners share observations, tips, and questions.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text NOT NULL,
  category        text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'beetle_alert', 'storm_damage', 'best_practice', 'question', 'market_update')),
  tags            text[] DEFAULT '{}',
  image_urls      text[] DEFAULT '{}',
  location        geometry(Point, 3006),           -- Optional SWEREF99 TM location
  county          text,                            -- e.g., 'Jönköpings län'
  municipality    text,
  is_pinned       boolean NOT NULL DEFAULT false,
  is_hidden       boolean NOT NULL DEFAULT false,  -- Moderation flag
  like_count      integer NOT NULL DEFAULT 0,
  comment_count   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author   ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_county   ON public.community_posts(county) WHERE county IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_location ON public.community_posts USING gist (location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_tags     ON public.community_posts USING gin (tags);

CREATE TRIGGER set_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Comments
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,  -- Threaded replies
  body        text NOT NULL,
  is_hidden   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post   ON public.community_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON public.community_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON public.community_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER set_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-increment comment_count on community_posts
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_community_comments_count
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

-- ────────────────────────────────────────────────────────────
-- 3. Likes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_likes_post ON public.community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON public.community_likes(user_id);

-- Auto-increment like_count on community_posts
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_community_likes_count
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.community_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes    ENABLE ROW LEVEL SECURITY;

-- Posts: all authenticated users can read non-hidden posts
CREATE POLICY "community_posts_select" ON public.community_posts
  FOR SELECT TO authenticated
  USING (is_hidden = false);

-- Posts: authenticated users can create posts
CREATE POLICY "community_posts_insert" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Posts: authors can update their own posts
CREATE POLICY "community_posts_update_own" ON public.community_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Posts: authors can delete their own posts
CREATE POLICY "community_posts_delete_own" ON public.community_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Comments: all authenticated users can read non-hidden comments
CREATE POLICY "community_comments_select" ON public.community_comments
  FOR SELECT TO authenticated
  USING (is_hidden = false);

-- Comments: authenticated users can create comments
CREATE POLICY "community_comments_insert" ON public.community_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Comments: authors can update their own comments
CREATE POLICY "community_comments_update_own" ON public.community_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Comments: authors can delete their own comments
CREATE POLICY "community_comments_delete_own" ON public.community_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Likes: all authenticated users can see likes
CREATE POLICY "community_likes_select" ON public.community_likes
  FOR SELECT TO authenticated
  USING (true);

-- Likes: authenticated users can like posts
CREATE POLICY "community_likes_insert" ON public.community_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Likes: users can remove their own likes
CREATE POLICY "community_likes_delete_own" ON public.community_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
