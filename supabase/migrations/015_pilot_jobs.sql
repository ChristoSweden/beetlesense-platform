-- ============================================================
-- BeetleSense.ai — Pilot Job Lifecycle
-- 015_pilot_jobs.sql
-- Tables for drone pilot job board: job postings, applications,
-- fee calculation, and assignment workflow.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Pilot Jobs
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pilot_jobs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  description       text,
  parcel_id         uuid        REFERENCES public.parcels(id) ON DELETE SET NULL,
  survey_id         uuid        REFERENCES public.surveys(id) ON DELETE SET NULL,
  owner_id          uuid        NOT NULL REFERENCES public.profiles(id),
  pilot_id          uuid        REFERENCES public.profiles(id),
  status            text        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','applied','assigned','in_progress','completed','cancelled')),
  fee_sek           numeric     NOT NULL DEFAULT 0,
  location_lat      double precision,
  location_lng      double precision,
  modules_required  text[]      NOT NULL DEFAULT '{}',
  deadline          date,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  assigned_at       timestamptz,
  completed_at      timestamptz
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_status     ON public.pilot_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_pilot_id   ON public.pilot_jobs(pilot_id);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_owner_id   ON public.pilot_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_parcel_id  ON public.pilot_jobs(parcel_id);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_survey_id  ON public.pilot_jobs(survey_id);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_deadline   ON public.pilot_jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_pilot_jobs_location   ON public.pilot_jobs(location_lat, location_lng);

CREATE TRIGGER set_updated_at_pilot_jobs
  BEFORE UPDATE ON public.pilot_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Pilot Applications
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pilot_applications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid        NOT NULL REFERENCES public.pilot_jobs(id) ON DELETE CASCADE,
  pilot_id        uuid        NOT NULL REFERENCES public.profiles(id),
  message         text,
  proposed_fee_sek numeric,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','rejected')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(job_id, pilot_id)
);

CREATE INDEX IF NOT EXISTS idx_pilot_applications_job_id    ON public.pilot_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_pilot_applications_pilot_id  ON public.pilot_applications(pilot_id);
CREATE INDEX IF NOT EXISTS idx_pilot_applications_status    ON public.pilot_applications(status);

-- ────────────────────────────────────────────────────────────
-- 3. Fee calculation function
--    Base: 500 SEK + 200 SEK per hectare + module surcharges
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_pilot_fee(
  p_area_ha numeric,
  p_modules text[]
) RETURNS numeric AS $$
DECLARE
  base_fee numeric := 500;
  area_fee numeric;
  module_surcharge numeric := 0;
  m text;
BEGIN
  area_fee := p_area_ha * 200;

  FOREACH m IN ARRAY p_modules
  LOOP
    CASE m
      WHEN 'LiDAR', 'lidar' THEN module_surcharge := module_surcharge + 500;
      WHEN 'Multispectral', 'multispectral' THEN module_surcharge := module_surcharge + 300;
      WHEN 'Thermal', 'thermal' THEN module_surcharge := module_surcharge + 250;
      WHEN '3D Model', '3d_model' THEN module_surcharge := module_surcharge + 400;
      ELSE module_surcharge := module_surcharge + 0;  -- RGB and others: no extra
    END CASE;
  END LOOP;

  RETURN ROUND(base_fee + area_fee + module_surcharge);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ────────────────────────────────────────────────────────────
-- 4. Auto-set assigned_at / completed_at timestamps
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pilot_jobs_lifecycle_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Set assigned_at when status changes to 'assigned'
  IF NEW.status = 'assigned' AND (OLD.status IS NULL OR OLD.status <> 'assigned') THEN
    NEW.assigned_at := now();
  END IF;

  -- Set completed_at when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_pilot_jobs_lifecycle
  BEFORE UPDATE ON public.pilot_jobs
  FOR EACH ROW EXECUTE FUNCTION public.pilot_jobs_lifecycle_trigger();

-- ════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.pilot_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_applications ENABLE ROW LEVEL SECURITY;

-- ── Pilot Jobs ──

-- Owners see their own posted jobs
CREATE POLICY "pilot_jobs_select_owner" ON public.pilot_jobs FOR SELECT
  USING (owner_id = auth.uid());

-- Pilots see open jobs + jobs assigned to them
CREATE POLICY "pilot_jobs_select_pilot" ON public.pilot_jobs FOR SELECT
  USING (
    status = 'open'
    OR pilot_id = auth.uid()
    -- Pilots can also see jobs they've applied to
    OR id IN (SELECT job_id FROM public.pilot_applications WHERE pilot_id = auth.uid())
  );

-- Owners can insert jobs
CREATE POLICY "pilot_jobs_insert_owner" ON public.pilot_jobs FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own jobs (assign pilot, cancel, etc.)
CREATE POLICY "pilot_jobs_update_owner" ON public.pilot_jobs FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Assigned pilots can update job status (in_progress, completed)
CREATE POLICY "pilot_jobs_update_pilot" ON public.pilot_jobs FOR UPDATE
  USING (pilot_id = auth.uid() AND status IN ('assigned', 'in_progress'))
  WITH CHECK (pilot_id = auth.uid());

-- ── Pilot Applications ──

-- Pilots see their own applications
CREATE POLICY "pilot_applications_select_pilot" ON public.pilot_applications FOR SELECT
  USING (pilot_id = auth.uid());

-- Job owners see applications on their jobs
CREATE POLICY "pilot_applications_select_owner" ON public.pilot_applications FOR SELECT
  USING (job_id IN (SELECT id FROM public.pilot_jobs WHERE owner_id = auth.uid()));

-- Pilots can create applications
CREATE POLICY "pilot_applications_insert_pilot" ON public.pilot_applications FOR INSERT
  WITH CHECK (pilot_id = auth.uid());

-- Job owners can update application status (accept/reject)
CREATE POLICY "pilot_applications_update_owner" ON public.pilot_applications FOR UPDATE
  USING (job_id IN (SELECT id FROM public.pilot_jobs WHERE owner_id = auth.uid()))
  WITH CHECK (job_id IN (SELECT id FROM public.pilot_jobs WHERE owner_id = auth.uid()));

-- ── Service role grants for edge functions ──
GRANT ALL ON public.pilot_jobs TO service_role;
GRANT ALL ON public.pilot_applications TO service_role;
