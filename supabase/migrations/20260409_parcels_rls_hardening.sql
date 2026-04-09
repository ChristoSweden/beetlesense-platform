-- ── Parcels RLS Hardening ────────────────────────────────────────────────────
--
-- The previous "parcels_select_org_or_access" policy was insecure:
-- if organization_id is NULL (which it can be for individually-owned parcels),
-- the subquery  `organization_id IN (SELECT organization_id ...)`  can match
-- every row that also has a NULL organization_id, leaking cross-user data.
--
-- This migration replaces it with two strict, owner_id-based policies:
--   1. SELECT — own parcels OR explicitly granted via parcel_access
--   2. ALL (INSERT/UPDATE/DELETE) — own parcels only

-- Drop existing broad policies
DROP POLICY IF EXISTS "parcels_select_org_or_access" ON parcels;
DROP POLICY IF EXISTS "parcels_select" ON parcels;
DROP POLICY IF EXISTS "parcels_insert_owner_admin" ON parcels;
DROP POLICY IF EXISTS "parcels_update_owner_admin" ON parcels;

-- Strict SELECT: own parcels OR explicitly granted access via parcel_access table
CREATE POLICY "parcels_owner_access" ON parcels
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM parcel_access
      WHERE parcel_id = parcels.id
        AND user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Strict WRITE: only the owner can insert/update/delete their parcels
CREATE POLICY "parcels_owner_write" ON parcels
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
