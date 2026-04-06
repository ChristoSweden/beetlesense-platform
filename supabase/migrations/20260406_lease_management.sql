-- Lease Management — hunting, recreation, grazing, berry-picking, and other land leases
-- BeetleSense v2.8 feature

CREATE TABLE IF NOT EXISTS public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('hunting', 'recreation', 'grazing', 'berry_picking', 'other')),
  lessee_name text NOT NULL,
  lessee_email text,
  lessee_phone text,
  annual_fee numeric NOT NULL,
  currency text DEFAULT 'SEK',
  start_date date NOT NULL,
  end_date date,
  auto_renew boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  terms text,
  area_ha numeric,
  documents jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leases_user ON public.leases(user_id);
CREATE INDEX idx_leases_parcel ON public.leases(parcel_id);
CREATE INDEX idx_leases_status ON public.leases(status);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own leases"
  ON public.leases
  FOR ALL
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_lease_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lease_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lease_updated_at();
