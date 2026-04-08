-- Community bark beetle alert network
-- Enables forest owners to submit and view regional beetle sightings

CREATE TABLE IF NOT EXISTS public.community_beetle_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  severity text NOT NULL CHECK (severity IN ('watch', 'warning', 'critical')) DEFAULT 'watch',
  affected_species text,
  trees_affected integer,
  description text,
  photos text[],
  created_at timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false
);

ALTER TABLE public.community_beetle_alerts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read alerts (so owners can see regional alerts)
CREATE POLICY "read_all_alerts" ON public.community_beetle_alerts
  FOR SELECT USING (true);

-- Users can only insert their own reports
CREATE POLICY "users_submit_own" ON public.community_beetle_alerts
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Users can update their own reports (e.g. add photos or correct severity)
CREATE POLICY "users_update_own" ON public.community_beetle_alerts
  FOR UPDATE USING (reporter_id = auth.uid());

-- Index for geo-proximity queries
CREATE INDEX IF NOT EXISTS idx_community_alerts_location
  ON public.community_beetle_alerts (lat, lng);

CREATE INDEX IF NOT EXISTS idx_community_alerts_severity
  ON public.community_beetle_alerts (severity);

CREATE INDEX IF NOT EXISTS idx_community_alerts_created_at
  ON public.community_beetle_alerts (created_at DESC);
