-- ============================================================================
-- Alert Delivery System — Tables, Indexes, and RLS Policies
-- BeetleSense.ai  |  2026-04-06
-- ============================================================================

-- ─── User preferences for digest & alert delivery ───────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_enabled boolean    DEFAULT false,
  digest_email  text,
  digest_frequency text     DEFAULT 'weekly'
    CHECK (digest_frequency IN ('daily', 'weekly', 'monthly')),
  push_enabled  boolean     DEFAULT true,

  -- Per-type alert toggles
  alert_beetle     boolean  DEFAULT true,
  alert_fire       boolean  DEFAULT true,
  alert_storm      boolean  DEFAULT true,
  alert_market     boolean  DEFAULT false,
  alert_compliance boolean  DEFAULT true,

  -- Quiet hours (local time values, app converts to UTC)
  quiet_hours_start time,
  quiet_hours_end   time,

  -- JSON blob for granular notification preferences (used by notificationStore)
  notification_preferences jsonb DEFAULT '{}'::jsonb,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_preferences IS
  'Per-user notification and digest delivery preferences.';

-- ─── Alert history ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alerts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  body        text        NOT NULL,
  type        text        NOT NULL
    CHECK (type IN ('beetle', 'fire', 'storm', 'market', 'compliance', 'system')),
  severity    text        NOT NULL
    CHECK (severity IN ('info', 'warning', 'critical')),
  parcel_id   uuid        REFERENCES public.parcels(id) ON DELETE SET NULL,
  channel     text
    CHECK (channel IN ('push', 'email', 'both', 'in_app')),

  -- Read tracking
  read        boolean     DEFAULT false,
  read_at     timestamptz,

  -- Dismiss tracking (soft-delete)
  is_dismissed boolean    DEFAULT false,
  dismissed_at timestamptz,

  -- Extra fields used by the existing useAlerts hook
  category    text,
  message     text,
  parcel_name text,
  is_read     boolean     DEFAULT false,
  organization_id uuid,
  metadata    jsonb       DEFAULT '{}'::jsonb,

  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON public.alerts(user_id, read);
CREATE INDEX IF NOT EXISTS idx_alerts_user_is_read ON public.alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts(created_at DESC);

COMMENT ON TABLE public.alerts IS
  'All alerts delivered to users — beetle, fire, storm, market, compliance, system.';

-- ─── Digest log ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.digest_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at          timestamptz DEFAULT now(),
  email            text        NOT NULL,
  summary          text        NOT NULL,
  parcels_included integer     DEFAULT 0,
  alerts_included  integer     DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_digest_log_user ON public.digest_log(user_id, sent_at DESC);

COMMENT ON TABLE public.digest_log IS
  'Log of every weekly/daily/monthly digest email sent.';

-- ─── Push subscriptions (may already exist) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb       NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON public.push_subscriptions(user_id);

-- ─── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digest_log        ENABLE ROW LEVEL SECURITY;

-- user_preferences
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- alerts
CREATE POLICY "Users can view own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert alerts (no INSERT policy needed for service-role,
-- but we add one so that RLS doesn't block edge functions using anon key)
CREATE POLICY "Service can insert alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

-- digest_log
CREATE POLICY "Users can view own digest log"
  ON public.digest_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert digest log"
  ON public.digest_log FOR INSERT
  WITH CHECK (true);
