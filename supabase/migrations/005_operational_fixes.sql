-- ============================================================
-- BeetleSense.ai — Operational Fixes Migration
-- 005_operational_fixes.sql
-- Adds user_preferences, extends reports, adds shared_reports,
-- adds inspector_survey_access, adds valuation_reports
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. User Preferences (for notification settings)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_prefs jsonb DEFAULT '{"survey_complete": true, "new_job_available": true, "report_shared": true, "marketing_updates": false}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_user_preferences
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Extend reports table with frontend-expected columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS parcel_name text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'shared'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS inspector_name text;

-- Auto-populate title from report_type + survey info
CREATE OR REPLACE FUNCTION public.set_report_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_parcel_name text;
  v_owner_id uuid;
BEGIN
  -- Get parcel name and owner from survey
  SELECT p.name, s.requested_by INTO v_parcel_name, v_owner_id
  FROM public.surveys s
  JOIN public.parcels p ON s.parcel_id = p.id
  WHERE s.id = NEW.survey_id;

  IF NEW.title IS NULL THEN
    NEW.title := COALESCE(
      initcap(replace(NEW.report_type, '_', ' ')) || ' — ' || COALESCE(v_parcel_name, 'Unknown'),
      'Report'
    );
  END IF;

  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := v_owner_id;
  END IF;

  IF NEW.parcel_name IS NULL THEN
    NEW.parcel_name := v_parcel_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_reports_set_defaults
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_report_defaults();

CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON public.reports(owner_id);

-- ────────────────────────────────────────────────────────────
-- 3. Shared Reports (for inspector/owner sharing)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  shared_by       uuid NOT NULL REFERENCES public.profiles(id),
  shared_with_email text NOT NULL,
  shared_at       timestamptz DEFAULT now(),
  UNIQUE(report_id, shared_with_email)
);

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see reports shared with them"
  ON public.shared_reports FOR SELECT
  USING (
    shared_with_email IN (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
    OR shared_by = auth.uid()
  );

CREATE POLICY "Users can share reports they own"
  ON public.shared_reports FOR INSERT
  WITH CHECK (shared_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_shared_reports_email ON public.shared_reports(shared_with_email);

-- ────────────────────────────────────────────────────────────
-- 4. Inspector Survey Access
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inspector_survey_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id   uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  access_level text DEFAULT 'read' CHECK (access_level IN ('read', 'review', 'admin')),
  granted_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(inspector_id, survey_id)
);

ALTER TABLE public.inspector_survey_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can see their own access grants"
  ON public.inspector_survey_access FOR SELECT
  USING (inspector_id = auth.uid());

CREATE POLICY "Admin/owner can grant inspector access"
  ON public.inspector_survey_access FOR INSERT
  WITH CHECK (
    granted_by IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
    )
    OR granted_by = auth.uid()
  );

-- ────────────────────────────────────────────────────────────
-- 5. Valuation Reports (inspector-specific reports)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id    uuid NOT NULL REFERENCES public.profiles(id),
  survey_id       uuid NOT NULL REFERENCES public.surveys(id),
  parcel_name     text,
  client_name     text,
  status          text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'complete')),
  valuation_data  jsonb DEFAULT '{}',
  storage_path    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can see own valuation reports"
  ON public.valuation_reports FOR SELECT
  USING (inspector_id = auth.uid());

CREATE POLICY "Inspectors can insert own valuation reports"
  ON public.valuation_reports FOR INSERT
  WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "Inspectors can update own valuation reports"
  ON public.valuation_reports FOR UPDATE
  USING (inspector_id = auth.uid())
  WITH CHECK (inspector_id = auth.uid());

CREATE TRIGGER set_updated_at_valuation_reports
  BEFORE UPDATE ON public.valuation_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_valuation_reports_inspector ON public.valuation_reports(inspector_id);
