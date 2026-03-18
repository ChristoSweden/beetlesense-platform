-- ============================================================
-- BeetleSense.ai — Parcel Sharing & Collaboration
-- 005_sharing.sql
-- Invitation-based parcel sharing with role-based access,
-- share tokens, optional password protection, and expiry.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Enum Types
-- ────────────────────────────────────────────────────────────

-- Share role levels
DO $$ BEGIN
  CREATE TYPE share_role AS ENUM ('viewer', 'commenter', 'editor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Share invitation status
DO $$ BEGIN
  CREATE TYPE share_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Parcel Shares Table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcel_shares (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,   -- NULL until invite accepted
  invited_email   text NOT NULL,
  role            share_role NOT NULL DEFAULT 'viewer',
  status          share_status NOT NULL DEFAULT 'pending',
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token     text UNIQUE,                                        -- For link-based sharing
  password_hash   text,                                               -- Optional password protection
  expires_at      timestamptz,                                        -- Optional expiry
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_parcel_shares_parcel_id     ON public.parcel_shares(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_shares_user_id       ON public.parcel_shares(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcel_shares_invited_email ON public.parcel_shares(invited_email);
CREATE INDEX IF NOT EXISTS idx_parcel_shares_share_token   ON public.parcel_shares(share_token) WHERE share_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcel_shares_parcel_user  ON public.parcel_shares(parcel_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcel_shares_parcel_email ON public.parcel_shares(parcel_id, invited_email) WHERE status = 'pending';

-- Updated_at trigger
CREATE TRIGGER trg_parcel_shares_updated_at
  BEFORE UPDATE ON public.parcel_shares
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.parcel_shares ENABLE ROW LEVEL SECURITY;

-- Parcel owners (org owner_id) can see all shares for their parcels
CREATE POLICY "parcel_shares_select_owner" ON public.parcel_shares
  FOR SELECT USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE owner_id = auth.uid()
    )
  );

-- Collaborators can see their own share records
CREATE POLICY "parcel_shares_select_self" ON public.parcel_shares
  FOR SELECT USING (auth.uid() = user_id);

-- Users with admin share role can see all shares for those parcels
CREATE POLICY "parcel_shares_select_admin" ON public.parcel_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Parcel owners can create shares
CREATE POLICY "parcel_shares_insert_owner" ON public.parcel_shares
  FOR INSERT WITH CHECK (
    parcel_id IN (
      SELECT id FROM public.parcels WHERE owner_id = auth.uid()
    )
  );

-- Admin collaborators can create shares
CREATE POLICY "parcel_shares_insert_admin" ON public.parcel_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Parcel owners can update shares
CREATE POLICY "parcel_shares_update_owner" ON public.parcel_shares
  FOR UPDATE USING (
    parcel_id IN (SELECT id FROM public.parcels WHERE owner_id = auth.uid())
  );

-- Collaborators can update own record (accept/reject invitation)
CREATE POLICY "parcel_shares_update_self" ON public.parcel_shares
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parcel owners can delete shares
CREATE POLICY "parcel_shares_delete_owner" ON public.parcel_shares
  FOR DELETE USING (
    parcel_id IN (SELECT id FROM public.parcels WHERE owner_id = auth.uid())
  );

-- Admin collaborators can delete shares
CREATE POLICY "parcel_shares_delete_admin" ON public.parcel_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Service role full access (for edge functions)
CREATE POLICY "parcel_shares_service" ON public.parcel_shares
  FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. Realtime
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.parcel_shares;
