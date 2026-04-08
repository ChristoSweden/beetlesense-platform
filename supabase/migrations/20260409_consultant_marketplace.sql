-- Consultant Marketplace
-- Certified foresters can list their services; owners can book consultations
-- BeetleSense earns 20% of advisory fees (handled in payment processor)

CREATE TABLE IF NOT EXISTS public.consultants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name text NOT NULL,
  certification_number text,
  specialisations text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  hourly_rate_sek integer,
  bio text,
  years_experience integer,
  languages text[] DEFAULT ARRAY['Swedish'],
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

-- Anyone can read verified consultant profiles (and own profile even if not yet verified)
CREATE POLICY "read_verified_consultants" ON public.consultants
  FOR SELECT USING (is_verified = true OR user_id = auth.uid());

-- Consultants manage their own profile
CREATE POLICY "consultants_manage_own" ON public.consultants
  FOR ALL USING (user_id = auth.uid());

-- Booking table
CREATE TABLE IF NOT EXISTS public.consultant_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id uuid NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  scheduled_for timestamptz,
  platform_fee_pct integer DEFAULT 20,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.consultant_bookings ENABLE ROW LEVEL SECURITY;

-- Both parties can see their own bookings
CREATE POLICY "parties_see_own_bookings" ON public.consultant_bookings
  FOR SELECT USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.consultants
      WHERE id = consultant_id AND user_id = auth.uid()
    )
  );

-- Clients can create bookings
CREATE POLICY "clients_create_bookings" ON public.consultant_bookings
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Either party can update (e.g. confirm, cancel)
CREATE POLICY "parties_update_bookings" ON public.consultant_bookings
  FOR UPDATE USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.consultants
      WHERE id = consultant_id AND user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultants_verified ON public.consultants (is_verified, is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.consultant_bookings (client_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_consultant ON public.consultant_bookings (consultant_id, status);
