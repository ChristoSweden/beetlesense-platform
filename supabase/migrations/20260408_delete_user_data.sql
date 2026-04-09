-- ============================================================================
-- BeetleSense.ai — GDPR "Right to Erasure" Helper Function
-- Migration: 20260408_delete_user_data.sql
--
-- Deletes all rows owned by a user before the auth record is removed.
-- Tables with ON DELETE CASCADE from auth.users are handled automatically
-- by Supabase when deleteUser() is called; this function clears any tables
-- that lack a cascade or need explicit ordering.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Companion chat history
  DELETE FROM public.companion_messages
    WHERE session_id IN (
      SELECT id FROM public.companion_sessions WHERE user_id = p_user_id
    );
  DELETE FROM public.companion_sessions WHERE user_id = p_user_id;

  -- Alert history and preferences
  DELETE FROM public.alerts          WHERE user_id = p_user_id;
  DELETE FROM public.user_preferences WHERE user_id = p_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.digest_log      WHERE user_id = p_user_id;

  -- Parcel access grants (user as grantee)
  DELETE FROM public.parcel_access   WHERE user_id = p_user_id;

  -- Parcels owned by this user (cascades parcel_access, satellite_observations, etc.)
  DELETE FROM public.parcels         WHERE owner_id = p_user_id;

  -- Reports
  DELETE FROM public.reports         WHERE user_id = p_user_id;

  -- Feedback
  DELETE FROM public.feedback        WHERE user_id = p_user_id;

  -- Vision identifications
  DELETE FROM public.identifications WHERE user_id = p_user_id;

  -- Processing jobs
  DELETE FROM public.processing_jobs WHERE user_id = p_user_id;

  -- User data embeddings
  DELETE FROM public.user_data_embeddings WHERE user_id = p_user_id;

  -- Profile (FK to auth.users, delete last)
  DELETE FROM public.profiles        WHERE id = p_user_id;
END;
$$;

-- Only authenticated users (via service-role in the Edge Function) may call this
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
