-- ============================================================
-- BeetleSense.ai — Quote Requests
-- 012_quote_requests.sql
-- Forest owners request quotes from contractors, drone pilots,
-- and other forestry professionals. Supports multi-provider
-- quoting with response tracking.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Quote Requests
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id   uuid REFERENCES public.organizations(id),
  -- What the quote is for
  parcel_id         uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  listing_id        uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,  -- Optional link to marketplace
  -- Service details
  service_type      text NOT NULL CHECK (service_type IN (
    'drone_survey', 'harvesting', 'planting', 'thinning',
    'road_maintenance', 'inspection', 'valuation',
    'beetle_treatment', 'transport', 'consulting', 'other'
  )),
  title             text NOT NULL,
  description       text NOT NULL,
  -- Scope
  area_ha           numeric,
  estimated_volume_m3 numeric,
  -- Location (SWEREF99 TM)
  work_area         geometry(MultiPolygon, 3006),                -- Specific work area
  county            text,
  municipality      text,
  -- Timing
  preferred_start   date,
  preferred_end     date,
  urgency           text DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'flexible')),
  -- Provider targeting
  target_provider_id uuid REFERENCES public.profiles(id),       -- NULL = open request
  -- Status
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'quoted', 'accepted', 'declined', 'expired', 'cancelled')),
  -- Response (filled by provider)
  quoted_price      numeric,
  quoted_currency   text DEFAULT 'SEK',
  quoted_at         timestamptz,
  quote_valid_until timestamptz,
  quote_notes       text,
  responded_by      uuid REFERENCES public.profiles(id),
  -- Metadata
  attachments       text[] DEFAULT '{}',                         -- Storage paths for supporting docs
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_requester   ON public.quote_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_provider    ON public.quote_requests(target_provider_id) WHERE target_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_status      ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_service     ON public.quote_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_quote_requests_parcel      ON public.quote_requests(parcel_id) WHERE parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_county      ON public.quote_requests(county) WHERE county IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_work_area   ON public.quote_requests USING gist (work_area) WHERE work_area IS NOT NULL;

CREATE TRIGGER set_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can see their own quote requests
CREATE POLICY "quote_requests_select_own" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Targeted providers can see requests directed at them
CREATE POLICY "quote_requests_select_targeted" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (target_provider_id = auth.uid());

-- Open requests visible to pilots and inspectors (potential providers)
CREATE POLICY "quote_requests_select_open" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND target_provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('pilot', 'inspector')
    )
  );

-- Same-org members can see org quote requests
CREATE POLICY "quote_requests_select_org" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Authenticated users can create quote requests
CREATE POLICY "quote_requests_insert" ON public.quote_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Requesters can update their own requests (edit, cancel)
CREATE POLICY "quote_requests_update_requester" ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

-- Targeted providers can update (submit quote response)
CREATE POLICY "quote_requests_update_provider" ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (target_provider_id = auth.uid())
  WITH CHECK (target_provider_id = auth.uid());

-- Requesters can delete draft requests
CREATE POLICY "quote_requests_delete_draft" ON public.quote_requests
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() AND status = 'draft');
