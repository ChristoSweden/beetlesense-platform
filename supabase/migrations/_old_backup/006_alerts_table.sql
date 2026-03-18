-- ============================================================
-- 006: Alerts table for seasonal proactive notifications
-- ============================================================

-- Alert categories enum
CREATE TYPE alert_category AS ENUM (
  'BEETLE_SEASON',
  'STORM_WARNING',
  'NDVI_DROP',
  'HARVEST_WINDOW',
  'FROST_RISK',
  'DROUGHT_STRESS',
  'REGULATORY_DEADLINE'
);

-- Alert severity enum
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  category      alert_category NOT NULL,
  severity      alert_severity NOT NULL DEFAULT 'info',
  title         text NOT NULL,
  message       text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}',
  parcel_id     uuid REFERENCES parcels(id) ON DELETE SET NULL,
  parcel_name   text,
  is_read       boolean NOT NULL DEFAULT false,
  is_dismissed  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz,
  dismissed_at  timestamptz
);

-- Indexes for common query patterns
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_user_unread ON alerts(user_id) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_category ON alerts(category);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_parcel ON alerts(parcel_id) WHERE parcel_id IS NOT NULL;

-- Push notifications queue table (for worker -> push delivery)
CREATE TABLE IF NOT EXISTS push_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE INDEX idx_push_notifications_pending ON push_notifications(status) WHERE status = 'pending';

-- RLS policies for alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY alerts_select_own ON alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read/dismiss) their own alerts
CREATE POLICY alerts_update_own ON alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert alerts (from workers)
CREATE POLICY alerts_insert_service ON alerts
  FOR INSERT WITH CHECK (true);

-- Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
