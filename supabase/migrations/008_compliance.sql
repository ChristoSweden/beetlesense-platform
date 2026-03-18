-- ============================================================
-- BeetleSense.ai — Compliance & Permits
-- 008_compliance.sql
-- Felling permits (avverkningsanmälan), permit documents,
-- and regulatory tracking per Swedish forestry law.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Felling Permits (Avverkningsanmälan)
--    Tracks mandatory 6-week notifications to Skogsstyrelsen
--    before felling operations.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.felling_permits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id           uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES public.organizations(id),
  submitted_by        uuid NOT NULL REFERENCES public.profiles(id),
  -- Permit details
  permit_type         text NOT NULL DEFAULT 'final_felling' CHECK (permit_type IN ('final_felling', 'thinning', 'sanitation_felling', 'road_construction', 'other')),
  skogsstyrelsen_ref  text,                                      -- Reference number from Skogsstyrelsen
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'approved', 'conditions_attached', 'rejected', 'expired')),
  -- Area details (SWEREF99 TM)
  felling_area        geometry(MultiPolygon, 3006),              -- Specific area within parcel
  area_ha             numeric,
  -- Dates
  submitted_at        timestamptz,
  notification_period_ends timestamptz,                          -- 6-week mandatory wait
  approved_at         timestamptz,
  valid_until         timestamptz,                               -- Permits typically valid 3 years
  -- Environmental considerations
  environmental_notes text,
  key_biotope         boolean DEFAULT false,
  water_protection    boolean DEFAULT false,
  cultural_heritage   boolean DEFAULT false,
  -- Metadata
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_felling_permits_parcel       ON public.felling_permits(parcel_id);
CREATE INDEX IF NOT EXISTS idx_felling_permits_org          ON public.felling_permits(organization_id);
CREATE INDEX IF NOT EXISTS idx_felling_permits_status       ON public.felling_permits(status);
CREATE INDEX IF NOT EXISTS idx_felling_permits_submitted_by ON public.felling_permits(submitted_by);
CREATE INDEX IF NOT EXISTS idx_felling_permits_valid_until  ON public.felling_permits(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_felling_permits_area         ON public.felling_permits USING gist (felling_area) WHERE felling_area IS NOT NULL;

CREATE TRIGGER set_felling_permits_updated_at
  BEFORE UPDATE ON public.felling_permits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Permit Documents
--    Supporting documents attached to felling permits.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.permit_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id       uuid NOT NULL REFERENCES public.felling_permits(id) ON DELETE CASCADE,
  uploaded_by     uuid NOT NULL REFERENCES public.profiles(id),
  document_type   text NOT NULL CHECK (document_type IN ('application_form', 'map', 'environmental_assessment', 'response_letter', 'conditions', 'appeal', 'other')),
  title           text NOT NULL,
  storage_path    text NOT NULL,
  file_size_bytes bigint,
  mime_type       text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permit_documents_permit ON public.permit_documents(permit_id);

-- ────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.felling_permits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;

-- Felling permits: same-org members can read
CREATE POLICY "felling_permits_select_org" ON public.felling_permits
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Felling permits: owner/admin can create
CREATE POLICY "felling_permits_insert" ON public.felling_permits
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Felling permits: owner/admin can update
CREATE POLICY "felling_permits_update" ON public.felling_permits
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Permit documents: same-org members can read (follows permit visibility)
CREATE POLICY "permit_documents_select" ON public.permit_documents
  FOR SELECT TO authenticated
  USING (
    permit_id IN (
      SELECT id FROM public.felling_permits
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Permit documents: owner/admin can upload
CREATE POLICY "permit_documents_insert" ON public.permit_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
