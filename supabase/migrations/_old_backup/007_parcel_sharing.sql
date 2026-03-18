-- ============================================================
-- 007: Parcel sharing & collaboration
-- ============================================================

-- Share role enum
CREATE TYPE share_role AS ENUM ('viewer', 'commenter', 'editor', 'admin');

-- Share invitation status enum
CREATE TYPE share_status AS ENUM ('pending', 'accepted', 'rejected');

-- Parcel shares table
CREATE TABLE IF NOT EXISTS parcel_shares (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   text NOT NULL,
  role            share_role NOT NULL DEFAULT 'viewer',
  status          share_status NOT NULL DEFAULT 'pending',
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token     text UNIQUE,
  password_hash   text,
  expires_at      timestamptz,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_parcel_shares_parcel_id ON parcel_shares(parcel_id);
CREATE INDEX idx_parcel_shares_user_id ON parcel_shares(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_parcel_shares_invited_email ON parcel_shares(invited_email);
CREATE INDEX idx_parcel_shares_share_token ON parcel_shares(share_token) WHERE share_token IS NOT NULL;
CREATE UNIQUE INDEX idx_parcel_shares_parcel_user ON parcel_shares(parcel_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_parcel_shares_parcel_email ON parcel_shares(parcel_id, invited_email) WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_parcel_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parcel_shares_updated_at
  BEFORE UPDATE ON parcel_shares
  FOR EACH ROW EXECUTE FUNCTION update_parcel_shares_updated_at();

-- RLS policies
ALTER TABLE parcel_shares ENABLE ROW LEVEL SECURITY;

-- Parcel owners can see all shares for their parcels
CREATE POLICY parcel_shares_select_owner ON parcel_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parcels
      WHERE parcels.id = parcel_shares.parcel_id
        AND parcels.created_by = auth.uid()
    )
  );

-- Collaborators can see their own share records
CREATE POLICY parcel_shares_select_self ON parcel_shares
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Admins (users with admin share role) can see all shares for parcels they admin
CREATE POLICY parcel_shares_select_admin ON parcel_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Parcel owners can insert shares
CREATE POLICY parcel_shares_insert_owner ON parcel_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parcels
      WHERE parcels.id = parcel_shares.parcel_id
        AND parcels.created_by = auth.uid()
    )
  );

-- Admins can insert shares for parcels they admin
CREATE POLICY parcel_shares_insert_admin ON parcel_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Parcel owners can update shares on their parcels
CREATE POLICY parcel_shares_update_owner ON parcel_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM parcels
      WHERE parcels.id = parcel_shares.parcel_id
        AND parcels.created_by = auth.uid()
    )
  );

-- Collaborators can update their own share record (accept/reject)
CREATE POLICY parcel_shares_update_self ON parcel_shares
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parcel owners can delete shares on their parcels
CREATE POLICY parcel_shares_delete_owner ON parcel_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM parcels
      WHERE parcels.id = parcel_shares.parcel_id
        AND parcels.created_by = auth.uid()
    )
  );

-- Admins can delete shares for parcels they admin
CREATE POLICY parcel_shares_delete_admin ON parcel_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM parcel_shares ps
      WHERE ps.parcel_id = parcel_shares.parcel_id
        AND ps.user_id = auth.uid()
        AND ps.role = 'admin'
        AND ps.status = 'accepted'
    )
  );

-- Service role can do everything (for edge functions)
CREATE POLICY parcel_shares_service ON parcel_shares
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE parcel_shares;
