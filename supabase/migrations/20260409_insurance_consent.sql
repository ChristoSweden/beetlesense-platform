-- Insurance data consent for B2B API access
-- Owners can opt-in to allow certified insurance partners to query their forest health data

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS insurance_data_consent boolean DEFAULT false;

-- Index for quick consent lookups by the edge function
CREATE INDEX IF NOT EXISTS idx_profiles_insurance_consent
  ON public.profiles (id, insurance_data_consent)
  WHERE insurance_data_consent = true;
