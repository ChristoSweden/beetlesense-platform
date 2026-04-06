-- Transaction tables for timber sales, contractor bookings, and carbon credit listings

CREATE TABLE IF NOT EXISTS public.timber_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'responded', 'accepted', 'completed', 'cancelled')),
  parcels jsonb NOT NULL DEFAULT '[]',
  total_volume_m3 numeric,
  min_price_sek numeric,
  delivery_terms text,
  certification text,
  timeline text,
  buyers jsonb DEFAULT '[]',
  responses jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  service_type text NOT NULL,
  contractor_id text,
  contractor_name text,
  parcel_id uuid,
  description text,
  date_start date,
  date_end date,
  budget_min numeric,
  budget_max numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carbon_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending_verification' CHECK (status IN ('draft', 'pending_verification', 'verified', 'listed', 'sold', 'expired')),
  parcels jsonb NOT NULL DEFAULT '[]',
  total_credits numeric NOT NULL,
  price_per_credit numeric,
  methodology text,
  marketplace text,
  verification_cost numeric,
  estimated_revenue numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.timber_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timber sales" ON public.timber_sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookings" ON public.contractor_bookings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own carbon listings" ON public.carbon_listings FOR ALL USING (auth.uid() = user_id);
