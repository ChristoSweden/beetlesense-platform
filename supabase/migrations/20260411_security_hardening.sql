-- ============================================================================
-- BeetleSense.ai — Security Hardening Migration
-- 20260411_security_hardening.sql
--
-- Fixes 10 CRITICAL security issues identified in database audit:
--   C1:  webhook_events — No RLS enabled
--   C2:  push_subscriptions — No RLS enabled
--   C3:  parcel_shares — Overly permissive service policy (missing TO service_role)
--   C4:  alerts — INSERT WITH CHECK (true) missing role restriction
--   C5:  push_notifications — INSERT WITH CHECK (true) missing role restriction
--   C6:  digest_log — INSERT WITH CHECK (true) missing role restriction
--   C7:  error_logs — INSERT allows any user_id (no ownership check)
--   C8:  community_beetle_alerts — SELECT readable by anon
--   C9:  pest_sightings — SELECT readable by anon
--   C10: user_reputation — SELECT readable by anon
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- C1: webhook_events — Enable RLS, restrict to service_role only
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_service_only"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C2: push_subscriptions — Enable RLS, restrict to own records + service_role
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_own_select"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_sub_own_insert"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_sub_own_delete"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_sub_service"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C3: parcel_shares — Replace overly permissive service policy with one
--     restricted to service_role only
--     Original: "parcel_shares_service" (005_sharing.sql) — missing TO service_role
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "parcel_shares_service" ON public.parcel_shares;

CREATE POLICY "parcel_shares_service_only"
  ON public.parcel_shares
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C4: alerts — INSERT WITH CHECK (true) allows any role to insert
--     Drop both permissive insert policies from 004_alerts.sql and
--     20260406_alert_system.sql, replace with service_role-restricted policy
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "alerts_insert_service" ON public.alerts;
DROP POLICY IF EXISTS "Service can insert alerts" ON public.alerts;

CREATE POLICY "alerts_insert_service"
  ON public.alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C5: push_notifications — INSERT WITH CHECK (true) allows any role to insert
--     Original: "push_notifications_insert_service" (004_alerts.sql)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "push_notifications_insert_service" ON public.push_notifications;

CREATE POLICY "push_notif_insert_service"
  ON public.push_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C6: digest_log — INSERT WITH CHECK (true) allows any role to insert
--     Original: "Service can insert digest log" (20260406_alert_system.sql)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service can insert digest log" ON public.digest_log;

CREATE POLICY "digest_log_insert_service"
  ON public.digest_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C7: error_logs — INSERT allows any user_id (no ownership enforcement)
--     Original: "Authenticated users can insert error logs"
--     (20260321_feedback_errorlogs_audit.sql)
--     Fix: user can only insert logs for themselves or with NULL user_id
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;

CREATE POLICY "error_logs_insert_own"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ────────────────────────────────────────────────────────────────────────────
-- C8: community_beetle_alerts — SELECT readable by anon (no role restriction)
--     Original: "read_all_alerts" (20260409_community_alerts.sql)
--     Fix: restrict to authenticated users only
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "read_all_alerts" ON public.community_beetle_alerts;

CREATE POLICY "beetle_alerts_read_authed"
  ON public.community_beetle_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C9: pest_sightings — SELECT readable by anon (no role restriction)
--     Original: "Anyone can view active sightings" (20260407_pest_intelligence.sql)
--     Fix: restrict to authenticated users, keep is_active filter
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view active sightings" ON public.pest_sightings;

CREATE POLICY "pest_sightings_read_authed"
  ON public.pest_sightings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ────────────────────────────────────────────────────────────────────────────
-- C10: user_reputation — SELECT readable by anon (no role restriction)
--      Original: "Anyone can view reputation" (20260406_forum_enhancements.sql)
--      Fix: restrict to authenticated users only
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view reputation" ON public.user_reputation;

CREATE POLICY "reputation_read_authed"
  ON public.user_reputation
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
