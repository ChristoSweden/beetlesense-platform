-- Forest sharing / multi-owner access
CREATE TABLE IF NOT EXISTS public.forest_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'manager', 'advisor')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  permissions jsonb DEFAULT '{"view_health": true, "view_financial": false, "view_operations": false, "edit_parcels": false, "manage_surveys": false, "manage_sales": false}'::jsonb,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  note text,
  UNIQUE(parcel_id, shared_with_email)
);

CREATE INDEX idx_forest_shares_owner ON public.forest_shares(owner_id);
CREATE INDEX idx_forest_shares_shared ON public.forest_shares(shared_with_user_id);
CREATE INDEX idx_forest_shares_email ON public.forest_shares(shared_with_email);

-- Activity log for shared forests
CREATE TABLE IF NOT EXISTS public.share_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid REFERENCES public.forest_shares(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.forest_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_activity_log ENABLE ROW LEVEL SECURITY;

-- Owner can see all shares they created
CREATE POLICY "Owners manage shares" ON public.forest_shares
  FOR ALL USING (auth.uid() = owner_id);

-- Shared users can see shares directed at them
CREATE POLICY "Shared users view their shares" ON public.forest_shares
  FOR SELECT USING (auth.uid() = shared_with_user_id);

-- Activity log visible to owner and shared user
CREATE POLICY "Share participants view activity" ON public.share_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forest_shares fs
      WHERE fs.id = share_id
      AND (fs.owner_id = auth.uid() OR fs.shared_with_user_id = auth.uid())
    )
  );
