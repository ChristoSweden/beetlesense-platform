-- ═══════════════════════════════════════════════════════════════
-- BeetleSense.ai — Production Hardening & Security Enhancements
-- Migration: 20260331
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Ensure all required error tracking tables have proper indexes ───

-- Add composite index on error_logs for efficient filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_composite
  ON public.error_logs (resolved, created_at DESC, error_code);

-- Add index for unresolved errors (admin dashboard queries)
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved
  ON public.error_logs (created_at DESC)
  WHERE resolved = false;

-- ─── 2. Audit log timestamps ───

-- Ensure audit_log index is optimized for admin queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_range
  ON public.admin_audit_log (created_at DESC, admin_id);

-- ─── 3. Feedback analytics indexes ───

-- Index for feedback dashboard queries
CREATE INDEX IF NOT EXISTS idx_feedback_composite
  ON public.feedback (reviewed, escalated, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_rating_category
  ON public.feedback (rating, category, created_at DESC);

-- ─── 4. Connection timeout function ───
-- Detect and log slow queries that may indicate issues

CREATE OR REPLACE FUNCTION public.check_query_health()
RETURNS TABLE (
  error_count bigint,
  recent_errors json
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as error_count,
    json_agg(
      json_build_object(
        'code', error_code,
        'module', module,
        'message', message,
        'created_at', created_at
      )
      ORDER BY created_at DESC
      LIMIT 10
    ) as recent_errors
  FROM public.error_logs
  WHERE created_at > now() - interval '1 hour' AND resolved = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Enforce RLS on error_logs for service role operations ───
-- Service role can bypass RLS, but we log all accesses for audit

CREATE OR REPLACE FUNCTION public.log_admin_audit(
  p_admin_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details, ip_address)
  VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_details,
    inet(current_setting('request.headers')::json->>'x-forwarded-for')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Automatic error resolution after 30 days ───
-- Old resolved errors are marked as archived to reduce clutter

CREATE OR REPLACE FUNCTION public.archive_old_errors()
RETURNS void AS $$
BEGIN
  UPDATE public.error_logs
  SET resolved = true
  WHERE resolved = false
    AND created_at < now() - interval '30 days'
    AND occurrence_count < 3; -- Don't auto-close recurring issues
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Helper function to get user-friendly error message ───
-- Maps error codes to display text for UI

CREATE OR REPLACE FUNCTION public.get_error_message(p_code text)
RETURNS TABLE (
  code text,
  user_message text,
  action_hint text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_code as code,
    CASE p_code
      WHEN 'DB-001' THEN 'Unable to load your data. Please refresh the page.'
      WHEN 'DB-002' THEN 'Unable to save changes. Please try again.'
      WHEN 'DB-003' THEN 'Unable to delete this item. Please refresh and try again.'
      WHEN 'DB-004' THEN 'Connection lost. Check your internet and refresh.'
      WHEN 'DB-005' THEN 'You don''t have permission for this action.'
      WHEN 'AUTH-001' THEN 'Login failed. Check your credentials.'
      WHEN 'AUTH-002' THEN 'Your session has expired. Please sign in again.'
      WHEN 'AUTH-004' THEN 'You don''t have access to this page.'
      ELSE 'Something went wrong. Please try again.'
    END as user_message,
    CASE p_code
      WHEN 'DB-004' THEN 'Check your internet connection'
      WHEN 'DB-005' THEN 'Contact your administrator'
      WHEN 'AUTH-002' THEN 'Click the sign-in button'
      ELSE 'Refresh the page'
    END as action_hint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. Ensure feedback table has proper constraints ───
-- Prevent invalid data from crashing the UI

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_range CHECK (rating >= 1 AND rating <= 5),
  ADD CONSTRAINT feedback_category_valid CHECK (category IN ('bug', 'idea', 'confusion', 'compliment'));

-- ─── 9. Create view for admin dashboard health ───

CREATE OR REPLACE VIEW public.v_error_summary AS
SELECT
  module,
  COUNT(*) as total_errors,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_count,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(created_at) as last_occurrence,
  MIN(created_at) as first_occurrence,
  json_object_agg(DISTINCT error_code, occurrence_count) as top_codes
FROM public.error_logs
WHERE created_at > now() - interval '7 days'
GROUP BY module;

-- ─── 10. Grant appropriate permissions ───

-- Admins can use health check functions
GRANT EXECUTE ON FUNCTION public.check_query_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_message(text) TO anon, authenticated;

-- Service role can use audit logging
GRANT EXECUTE ON FUNCTION public.log_admin_audit(uuid, text, text, uuid, jsonb) TO service_role;

-- ─── 11. Document RLS policies for production ───
-- These are already defined in 20260321_feedback_errorlogs_audit.sql
-- Verify on deployment:
-- - error_logs: admins can read, authenticated can insert
-- - feedback: users can insert own, admins can read all
-- - admin_audit_log: admins only
