-- Crowdsourced Pest Intelligence System
-- Community pest reporting, GPS-tagged sightings, verification, nearby alerts

CREATE TABLE IF NOT EXISTS public.pest_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name text,

  -- Location
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  county text,
  municipality text,
  nearest_parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,

  -- Pest details
  pest_type text NOT NULL CHECK (pest_type IN ('bark_beetle', 'spruce_budworm', 'root_rot', 'pine_weevil', 'wild_boar', 'storm_damage', 'drought_stress', 'fire_damage', 'unknown', 'other')),
  severity text NOT NULL CHECK (severity IN ('suspected', 'confirmed_minor', 'confirmed_moderate', 'confirmed_severe', 'outbreak')),
  affected_species text[] DEFAULT '{}',
  affected_area_ha numeric,
  tree_count integer,

  -- Media
  photos jsonb DEFAULT '[]',

  -- AI analysis
  ai_detected boolean DEFAULT false,
  ai_confidence numeric,
  ai_pest_type text,
  ai_severity text,

  -- Verification
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'community_verified', 'expert_verified', 'disputed', 'retracted')),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  verifications jsonb DEFAULT '[]',

  -- Metadata
  description text,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pest_sightings_type ON public.pest_sightings(pest_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pest_sightings_active ON public.pest_sightings(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pest_sightings_location ON public.pest_sightings(latitude, longitude);

CREATE TABLE IF NOT EXISTS public.pest_alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
  radius_km numeric DEFAULT 10,
  pest_types text[] DEFAULT '{}',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, parcel_id)
);

ALTER TABLE public.pest_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pest_alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sightings" ON public.pest_sightings FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can report" ON public.pest_sightings FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users manage own sightings" ON public.pest_sightings FOR UPDATE USING (auth.uid() = reporter_id);
CREATE POLICY "Users manage own subscriptions" ON public.pest_alert_subscriptions FOR ALL USING (auth.uid() = user_id);
