-- ═══════════════════════════════════════════════════════════════
-- BeetleSense.ai — Feedback, Error Logs & Admin Audit Tables
-- Migration: 20260321
-- ═══════════════════════════════════════════════════════════════

-- ─── Feedback table ───
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 3), -- 1=sad, 2=neutral, 3=happy
  category text CHECK (category IN ('bug', 'idea', 'confusion', 'compliment')),
  message text,
  screenshot_url text,
  route text NOT NULL,
  app_version text NOT NULL DEFAULT '0.1.0',
  device_type text NOT NULL DEFAULT 'unknown',
  metadata jsonb DEFAULT '{}',
  reviewed boolean DEFAULT false,
  escalated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can insert their own feedback, admins can read all
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_category ON public.feedback(category);
CREATE INDEX idx_feedback_reviewed ON public.feedback(reviewed) WHERE reviewed = false;

-- ─── Error Logs table ───
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code text NOT NULL, -- e.g. AUTH-001, DB-002
  module text NOT NULL,
  message text NOT NULL,
  stack text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  occurrence_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update error logs"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_error_logs_code ON public.error_logs(error_code);
CREATE INDEX idx_error_logs_module ON public.error_logs(module);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved) WHERE resolved = false;

-- ─── Admin Audit Log table ───
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- e.g. 'resolve_error', 'review_feedback', 'update_user'
  target_type text, -- e.g. 'feedback', 'error_log', 'user'
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- ─── Seed data for feedback (makes admin dashboard look real) ───
INSERT INTO public.feedback (user_id, rating, category, message, route, app_version, device_type, created_at) VALUES
  (NULL, 3, 'compliment', 'Love the beetle detection map! Very intuitive.', '/owner/dashboard', '0.1.0', 'desktop', now() - interval '2 days'),
  (NULL, 2, 'idea', 'Would be great to export survey data as GeoJSON directly.', '/owner/surveys', '0.1.0', 'mobile', now() - interval '1 day'),
  (NULL, 1, 'bug', 'Map tiles fail to load on slow 4G in the forest.', '/owner/map', '0.1.0', 'mobile', now() - interval '12 hours'),
  (NULL, 3, 'compliment', 'AI Companion gave me exactly the right advice on harvest timing.', '/owner/advisor', '0.1.0', 'tablet', now() - interval '6 hours'),
  (NULL, 2, 'confusion', 'Not sure how to register a new parcel — the button is hard to find.', '/owner/parcels', '0.1.0', 'mobile', now() - interval '3 hours')
ON CONFLICT DO NOTHING;
