-- ============================================================
-- BeetleSense.ai — Alerts & Push Notifications
-- 004_alerts.sql
-- Seasonal proactive alerts (beetle season, storm warnings,
-- NDVI drops) and push notification delivery queue.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Enum Types
-- ────────────────────────────────────────────────────────────

-- Alert categories for forest-specific notifications
DO $$ BEGIN
  CREATE TYPE alert_category AS ENUM (
    'BEETLE_SEASON',
    'STORM_WARNING',
    'NDVI_DROP',
    'HARVEST_WINDOW',
    'FROST_RISK',
    'DROUGHT_STRESS',
    'REGULATORY_DEADLINE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alert severity levels
DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Alerts Table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  category        alert_category NOT NULL,
  severity        alert_severity NOT NULL DEFAULT 'info',
  title           text NOT NULL,
  message         text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}',
  parcel_id       uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  parcel_name     text,
  is_read         boolean NOT NULL DEFAULT false,
  is_dismissed    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz,
  dismissed_at    timestamptz
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alerts_user_id     ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON public.alerts(user_id) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created_at  ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_category    ON public.alerts(category);
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_parcel      ON public.alerts(parcel_id) WHERE parcel_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Push Notifications Queue
--    Worker processes pick up pending rows and deliver
--    via web push / FCM / APNs.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_pending ON public.push_notifications(status) WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY "alerts_select_own" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read/dismiss) their own alerts
CREATE POLICY "alerts_update_own" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (workers) can insert alerts for any user
CREATE POLICY "alerts_insert_service" ON public.alerts
  FOR INSERT WITH CHECK (true);

-- Push notifications: only service role inserts; users never read directly
CREATE POLICY "push_notifications_insert_service" ON public.push_notifications
  FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. Realtime subscription for alerts
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
