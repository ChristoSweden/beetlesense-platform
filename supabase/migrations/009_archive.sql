-- ============================================================
-- BeetleSense.ai — Forest Archive
-- 009_archive.sql
-- Long-term forest history events and family stewardship
-- records for multi-generational forest management.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Forest Archive Events
--    Historical timeline of significant events per parcel:
--    plantings, fellings, storms, fires, ownership transfers,
--    certifications, and notable observations.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forest_archive_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  recorded_by     uuid NOT NULL REFERENCES public.profiles(id),
  -- Event details
  event_type      text NOT NULL CHECK (event_type IN (
    'planting', 'thinning', 'final_felling', 'sanitation_felling',
    'storm_damage', 'fire', 'beetle_outbreak', 'disease',
    'ownership_transfer', 'certification', 'boundary_change',
    'road_construction', 'drainage', 'fertilization',
    'wildlife_observation', 'cultural_find', 'other'
  )),
  title           text NOT NULL,
  description     text,
  event_date      date NOT NULL,
  end_date        date,                                          -- For events spanning a period
  -- Spatial (optional area within parcel, SWEREF99 TM)
  event_area      geometry(MultiPolygon, 3006),
  area_ha         numeric,
  -- Media
  image_urls      text[] DEFAULT '{}',
  document_urls   text[] DEFAULT '{}',
  -- Quantitative data
  volume_m3       numeric,                                       -- Timber volume if applicable
  tree_count      integer,
  species         text[],                                        -- Tree species involved
  -- Metadata
  source          text DEFAULT 'manual' CHECK (source IN ('manual', 'survey', 'satellite', 'import', 'skogsstyrelsen')),
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archive_events_parcel    ON public.forest_archive_events(parcel_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_archive_events_type      ON public.forest_archive_events(event_type);
CREATE INDEX IF NOT EXISTS idx_archive_events_date      ON public.forest_archive_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_archive_events_recorded  ON public.forest_archive_events(recorded_by);
CREATE INDEX IF NOT EXISTS idx_archive_events_area      ON public.forest_archive_events USING gist (event_area) WHERE event_area IS NOT NULL;

CREATE TRIGGER set_archive_events_updated_at
  BEFORE UPDATE ON public.forest_archive_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Family Stewards
--    Records of family members who have managed the forest
--    over generations. Links to parcels for lineage tracking.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.family_stewards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  added_by        uuid NOT NULL REFERENCES public.profiles(id),
  -- Steward details
  full_name       text NOT NULL,
  relationship    text,                                          -- e.g., 'farfar', 'morfar', 'förälder'
  role_description text,                                         -- e.g., 'Skogsbrukare', 'Markägare'
  start_year      integer,                                       -- Year they began stewardship
  end_year        integer,                                       -- NULL if current steward
  portrait_url    text,
  notes           text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_stewards_parcel ON public.family_stewards(parcel_id, start_year);
CREATE INDEX IF NOT EXISTS idx_family_stewards_added  ON public.family_stewards(added_by);

CREATE TRIGGER set_family_stewards_updated_at
  BEFORE UPDATE ON public.family_stewards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.forest_archive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_stewards       ENABLE ROW LEVEL SECURITY;

-- Archive events: visible to org members and users with parcel access
CREATE POLICY "archive_events_select" ON public.forest_archive_events
  FOR SELECT TO authenticated
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    OR parcel_id IN (
      SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid()
    )
  );

-- Archive events: org owner/admin can create
CREATE POLICY "archive_events_insert" ON public.forest_archive_events
  FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());

-- Archive events: author can update
CREATE POLICY "archive_events_update_own" ON public.forest_archive_events
  FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (recorded_by = auth.uid());

-- Archive events: author can delete
CREATE POLICY "archive_events_delete_own" ON public.forest_archive_events
  FOR DELETE TO authenticated
  USING (recorded_by = auth.uid());

-- Family stewards: same visibility as archive events
CREATE POLICY "family_stewards_select" ON public.family_stewards
  FOR SELECT TO authenticated
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    OR parcel_id IN (
      SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid()
    )
  );

-- Family stewards: org members can add
CREATE POLICY "family_stewards_insert" ON public.family_stewards
  FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid());

-- Family stewards: author can update
CREATE POLICY "family_stewards_update_own" ON public.family_stewards
  FOR UPDATE TO authenticated
  USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

-- Family stewards: author can delete
CREATE POLICY "family_stewards_delete_own" ON public.family_stewards
  FOR DELETE TO authenticated
  USING (added_by = auth.uid());
