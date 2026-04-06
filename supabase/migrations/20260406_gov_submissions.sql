-- Government submissions table (avverkningsanmälan, samråd, biotopskydd, etc.)
CREATE TABLE IF NOT EXISTS public.gov_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('avverkningsanmalan', 'samrad', 'biotopskydd', 'other')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'acknowledged', 'approved', 'rejected')),
  reference_number text,
  parcel_id uuid REFERENCES public.parcels(id),
  fastighetsbeteckning text NOT NULL,
  area_ha numeric NOT NULL,
  method text CHECK (method IN ('slutavverkning', 'gallring', 'rojarning', 'other')),
  planned_start date,
  planned_end date,
  volume_m3 numeric,
  species_mix jsonb DEFAULT '{}',
  environmental_considerations text,
  cultural_heritage_notes text,
  natura2000_overlap boolean DEFAULT false,
  nyckelbiotop_overlap boolean DEFAULT false,
  form_data jsonb DEFAULT '{}',
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  response_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gov_submissions_user ON public.gov_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_submissions_status ON public.gov_submissions(status);
CREATE INDEX IF NOT EXISTS idx_gov_submissions_parcel ON public.gov_submissions(parcel_id);

ALTER TABLE public.gov_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own submissions"
  ON public.gov_submissions
  FOR ALL
  USING (auth.uid() = user_id);
