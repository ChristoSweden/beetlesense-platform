-- Forum Enhancements Migration
-- Adds: user reputation, post reports, bookmarks, subscriptions, full-text search

-- User reputation system
CREATE TABLE IF NOT EXISTS public.user_reputation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  level text DEFAULT 'newcomer' CHECK (level IN ('newcomer', 'contributor', 'trusted', 'expert', 'moderator')),
  posts_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  verified_forester boolean DEFAULT false,
  badge_list text[] DEFAULT '{}',
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Post reports / flagging
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'off_topic', 'illegal', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Bookmarks / saved posts
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Post subscriptions (follow threads)
CREATE TABLE IF NOT EXISTS public.post_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  notify_replies boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Add full-text search column to posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('swedish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('swedish', coalesce(NEW.body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_search_vector ON public.community_posts;
CREATE TRIGGER trg_update_search_vector
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

CREATE INDEX IF NOT EXISTS idx_posts_search ON public.community_posts USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON public.post_bookmarks(user_id);

-- RLS
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reputation" ON public.user_reputation FOR SELECT USING (true);
CREATE POLICY "Users manage own reputation" ON public.user_reputation FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can report" ON public.post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON public.post_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users manage own bookmarks" ON public.post_bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subscriptions" ON public.post_subscriptions FOR ALL USING (auth.uid() = user_id);
