-- ============================================================
-- BeetleSense.ai — Core Schema
-- 001_core_schema.sql
-- Core tables: organizations, profiles, parcels, surveys,
-- plus helper functions, triggers, and RLS policies.
-- All spatial data uses SWEREF99 TM (EPSG:3006).
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Helper: updated_at trigger function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 2. JWT claim helper functions (used by RLS policies)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_organization_id()
RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 3. Organizations
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        UNIQUE NOT NULL,
  org_type      text        NOT NULL CHECK (org_type IN ('forest_owner','forestry_company','inspection_firm','research','drone_operator')),
  billing_plan  text        DEFAULT 'starter' CHECK (billing_plan IN ('starter','professional','enterprise')),
  settings      jsonb       DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. Profiles (extends auth.users)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES public.organizations(id),
  role            text        NOT NULL CHECK (role IN ('owner','pilot','inspector','admin')),
  full_name       text,
  email           text,
  phone           text,
  avatar_url      text,
  language        text        DEFAULT 'sv',
  region          text,
  onboarded       boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'sv'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 5. Pilot Profiles (extends profiles for drone pilots)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pilot_profiles (
  id                  uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_no     text,
  certification       text,
  insurance_doc_path  text,
  coverage_area       geometry(Polygon, 4326),       -- WGS84 for pilot coverage display
  drone_models        text[],
  sensor_payloads     text[],
  sample_work_paths   text[],
  hourly_rate         numeric,
  rating              numeric     DEFAULT 0,
  completed_missions  integer     DEFAULT 0,
  verified            boolean     DEFAULT false,
  application_status  text        DEFAULT 'submitted' CHECK (application_status IN ('submitted','review','approved','rejected')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_profiles_coverage ON public.pilot_profiles USING GIST (coverage_area);

CREATE TRIGGER set_updated_at_pilot_profiles
  BEFORE UPDATE ON public.pilot_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 6. User Preferences
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_prefs jsonb DEFAULT '{"survey_complete": true, "new_job_available": true, "report_shared": true, "marketing_updates": false}',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TRIGGER set_updated_at_user_preferences
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 7. Parcels (forest parcels with PostGIS geometry)
--    All boundaries stored in SWEREF99 TM (EPSG:3006).
--    WGS84 boundary and centroid are auto-computed by trigger.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcels (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  owner_id        uuid        NOT NULL REFERENCES public.profiles(id),
  name            text,
  fastighets_id   text,                                          -- Swedish cadastral ID (fastighetsbeteckning)
  boundary        geometry(MultiPolygon, 3006) NOT NULL,         -- SWEREF99 TM
  boundary_wgs84  geometry(MultiPolygon, 4326),                  -- Auto-computed
  area_ha         numeric     GENERATED ALWAYS AS (ST_Area(boundary) / 10000.0) STORED,
  centroid        geometry(Point, 4326),                         -- Auto-computed
  county          text,
  municipality    text,
  status          text        DEFAULT 'active' CHECK (status IN ('pending','active','archived')),
  last_sync_at    timestamptz,
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcels_boundary       ON public.parcels USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_parcels_boundary_wgs84 ON public.parcels USING GIST (boundary_wgs84);
CREATE INDEX IF NOT EXISTS idx_parcels_organization_id ON public.parcels(organization_id);
CREATE INDEX IF NOT EXISTS idx_parcels_owner_id        ON public.parcels(owner_id);

CREATE TRIGGER set_updated_at_parcels
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-compute WGS84 boundary + centroid from SWEREF99 TM boundary
CREATE OR REPLACE FUNCTION public.compute_parcel_wgs84()
RETURNS TRIGGER AS $$
BEGIN
  NEW.boundary_wgs84 := ST_Transform(NEW.boundary, 4326);
  NEW.centroid := ST_Centroid(ST_Transform(NEW.boundary, 4326));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_parcels_compute_wgs84
  BEFORE INSERT OR UPDATE OF boundary ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.compute_parcel_wgs84();

-- ────────────────────────────────────────────────────────────
-- 8. Parcel Open Data (cached external data layers per parcel)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcel_open_data (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id     uuid        NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  source        text        NOT NULL,
  data_version  text,
  storage_path  text        NOT NULL,
  fetched_at    timestamptz DEFAULT now(),
  metadata      jsonb       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_parcel_open_data_parcel_id ON public.parcel_open_data(parcel_id);

-- ────────────────────────────────────────────────────────────
-- 9. Parcel Access (granular sharing between users)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcel_access (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id     uuid        NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level  text        DEFAULT 'read' CHECK (access_level IN ('read','write','admin')),
  granted_by    uuid        REFERENCES public.profiles(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(parcel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_parcel_access_parcel_id ON public.parcel_access(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_access_user_id   ON public.parcel_access(user_id);

-- ────────────────────────────────────────────────────────────
-- 10. Surveys
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.surveys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       uuid        NOT NULL REFERENCES public.parcels(id),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  requested_by    uuid        NOT NULL REFERENCES public.profiles(id),
  pilot_id        uuid        REFERENCES public.profiles(id),
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','requested','assigned','flying','uploading','processing','review','complete','failed')),
  modules         text[]      NOT NULL DEFAULT '{}',
  priority        text        DEFAULT 'standard' CHECK (priority IN ('standard','priority')),
  sla_deadline    timestamptz,
  flight_date     date,
  notes           text,
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_organization_id ON public.surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_parcel_id       ON public.surveys(parcel_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status          ON public.surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_pilot_id        ON public.surveys(pilot_id);
CREATE INDEX IF NOT EXISTS idx_surveys_requested_by    ON public.surveys(requested_by);

CREATE TRIGGER set_updated_at_surveys
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 11. Survey Uploads
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.survey_uploads (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL REFERENCES public.organizations(id),
  upload_type       text        NOT NULL CHECK (upload_type IN ('drone_rgb','drone_multispectral','drone_thermal','drone_lidar','enose_csv','smartphone_photo','flight_log')),
  storage_path      text        NOT NULL,
  original_filename text,
  file_size_bytes   bigint,
  checksum_sha256   text,
  geo_bounds        geometry(Polygon, 4326),
  status            text        DEFAULT 'pending' CHECK (status IN ('pending','validating','ready','invalid','processing','error')),
  metadata          jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_uploads_survey_id       ON public.survey_uploads(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_organization_id ON public.survey_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_geo_bounds      ON public.survey_uploads USING GIST (geo_bounds);

-- ────────────────────────────────────────────────────────────
-- 12. Satellite Observations
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.satellite_observations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id         uuid        NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  source            text        NOT NULL CHECK (source IN ('sentinel2','sentinel1_sar','landsat','modis')),
  observation_date  date        NOT NULL,
  cloud_cover_pct   numeric,
  ndvi_mean         numeric,
  ndvi_min          numeric,
  ndvi_max          numeric,
  band_data_path    text,
  thumbnail_path    text,
  quality           text        DEFAULT 'good' CHECK (quality IN ('good','moderate','poor')),
  metadata          jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_satellite_obs_parcel_date ON public.satellite_observations(parcel_id, observation_date DESC);

-- ────────────────────────────────────────────────────────────
-- 13. Companion Sessions & Messages (AI forestry advisor)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companion_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id),
  parcel_id   uuid        REFERENCES public.parcels(id),
  title       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_sessions_user_id ON public.companion_sessions(user_id);

CREATE TRIGGER set_updated_at_companion_sessions
  BEFORE UPDATE ON public.companion_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.companion_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.companion_sessions(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user','assistant','system')),
  content     text        NOT NULL,
  sources     jsonb       DEFAULT '[]',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_messages_session_id ON public.companion_messages(session_id);

-- ────────────────────────────────────────────────────────────
-- 14. Reports
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     uuid        NOT NULL REFERENCES public.surveys(id),
  report_type   text        DEFAULT 'standard' CHECK (report_type IN ('standard','inspector_valuation','insurance_claim','custom')),
  template_id   text,
  language      text        DEFAULT 'sv',
  storage_path  text,
  generated_at  timestamptz,
  title         text,
  owner_id      uuid        REFERENCES public.profiles(id),
  parcel_name   text,
  status        text        DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'shared')),
  pdf_url       text,
  inspector_name text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_survey_id ON public.reports(survey_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner_id  ON public.reports(owner_id);

-- Auto-populate report title and owner from survey/parcel
CREATE OR REPLACE FUNCTION public.set_report_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_parcel_name text;
  v_owner_id uuid;
BEGIN
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

-- ────────────────────────────────────────────────────────────
-- 15. Shared Reports
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  shared_by         uuid NOT NULL REFERENCES public.profiles(id),
  shared_with_email text NOT NULL,
  shared_at         timestamptz DEFAULT now(),
  UNIQUE(report_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS idx_shared_reports_email ON public.shared_reports(shared_with_email);

-- ────────────────────────────────────────────────────────────
-- 16. Inspector Survey Access
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inspector_survey_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id    uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  access_level text DEFAULT 'read' CHECK (access_level IN ('read', 'review', 'admin')),
  granted_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(inspector_id, survey_id)
);

-- ────────────────────────────────────────────────────────────
-- 17. Valuation Reports (inspector-specific)
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

CREATE INDEX IF NOT EXISTS idx_valuation_reports_inspector ON public.valuation_reports(inspector_id);

CREATE TRIGGER set_updated_at_valuation_reports
  BEFORE UPDATE ON public.valuation_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 18. Convenience View: profile with organization name
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.profile_with_org AS
SELECT
  p.*,
  o.name AS organization_name
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id;

-- ────────────────────────────────────────────────────────────
-- 19. Web Search Results (search cache for AI companion)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.web_search_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query         text NOT NULL,
  provider      text NOT NULL DEFAULT 'brave',
  url           text NOT NULL,
  title         text NOT NULL,
  snippet       text,
  published_at  timestamptz,
  raw_payload   jsonb,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_web_search_url UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_web_search_fetched ON public.web_search_results(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_search_query   ON public.web_search_results USING gin (to_tsvector('simple', query || ' ' || title));

-- ────────────────────────────────────────────────────────────
-- 20. Curated News
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.curated_news (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url      text NOT NULL,
  title           text NOT NULL,
  summary         text,
  category        text NOT NULL DEFAULT 'general',
  relevance_score real NOT NULL DEFAULT 0,
  recency_score   real NOT NULL DEFAULT 0,
  combined_score  real NOT NULL DEFAULT 0,
  image_url       text,
  language        text NOT NULL DEFAULT 'en',
  published_at    timestamptz,
  expires_at      timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_curated_news_url UNIQUE (source_url)
);

CREATE INDEX IF NOT EXISTS idx_curated_news_category ON public.curated_news(category, combined_score DESC);
CREATE INDEX IF NOT EXISTS idx_curated_news_created  ON public.curated_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curated_news_expires  ON public.curated_news(expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER set_curated_news_updated_at
  BEFORE UPDATE ON public.curated_news
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 21. Blog Posts
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title_en      text NOT NULL,
  title_sv      text NOT NULL,
  summary_en    text,
  summary_sv    text,
  content_en    text NOT NULL,
  content_sv    text NOT NULL,
  category      text NOT NULL DEFAULT 'forest-health',
  tags          text[] DEFAULT '{}',
  cover_image   text,
  sources       jsonb DEFAULT '[]',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at  timestamptz,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_blog_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_status   ON public.blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_tags     ON public.blog_posts USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_blog_slug     ON public.blog_posts(slug);

CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 22. Vision Identifications (phone camera species/disease ID)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.identifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path      text NOT NULL,
  thumbnail_path  text,
  location        geometry(Point, 3006),      -- SWEREF99 TM
  latitude        double precision,
  longitude       double precision,
  -- Classification results
  category        text NOT NULL DEFAULT 'unknown' CHECK (category IN ('tree', 'animal', 'plant', 'disease', 'insect', 'unknown')),
  species_name    text,
  common_name_en  text,
  common_name_sv  text,
  confidence      real NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  top_candidates  jsonb DEFAULT '[]',
  -- Disease-specific
  disease_name    text,
  severity        text CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),
  -- Model metadata
  model_version   text,
  inference_ms    integer,
  raw_output      jsonb,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identifications_user     ON public.identifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identifications_category ON public.identifications(category);
CREATE INDEX IF NOT EXISTS idx_identifications_species  ON public.identifications(species_name) WHERE species_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_identifications_location ON public.identifications USING gist (location) WHERE location IS NOT NULL;

CREATE TRIGGER set_identifications_updated_at
  BEFORE UPDATE ON public.identifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- RLS: Enable Row Level Security on all core tables
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_open_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_access          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_uploads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_survey_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_search_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_news           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identifications        ENABLE ROW LEVEL SECURITY;

-- ── Organizations ──
CREATE POLICY "organizations_select_members" ON public.organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "organizations_insert_admin" ON public.organizations FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'owner'));
CREATE POLICY "organizations_update_admin" ON public.organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')))
  WITH CHECK (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- ── Profiles ──
CREATE POLICY "profiles_select_own_and_org" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── Pilot Profiles ──
CREATE POLICY "pilot_profiles_select_all" ON public.pilot_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "pilot_profiles_insert_own" ON public.pilot_profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "pilot_profiles_update_own" ON public.pilot_profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── User Preferences ──
CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Parcels ──
CREATE POLICY "parcels_select_org_or_access" ON public.parcels FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR id IN (SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid())
  );
CREATE POLICY "parcels_insert_owner_admin" ON public.parcels FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "parcels_update_owner_admin" ON public.parcels FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ── Parcel Open Data ──
CREATE POLICY "parcel_open_data_select" ON public.parcel_open_data FOR SELECT
  USING (parcel_id IN (
    SELECT id FROM public.parcels WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    UNION SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid()
  ));

-- ── Parcel Access ──
CREATE POLICY "parcel_access_select_involved" ON public.parcel_access FOR SELECT
  USING (user_id = auth.uid() OR parcel_id IN (SELECT id FROM public.parcels WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))));
CREATE POLICY "parcel_access_insert_admin" ON public.parcel_access FOR INSERT
  WITH CHECK (parcel_id IN (SELECT id FROM public.parcels WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))));
CREATE POLICY "parcel_access_delete_admin" ON public.parcel_access FOR DELETE
  USING (parcel_id IN (SELECT id FROM public.parcels WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))));

-- ── Surveys ──
CREATE POLICY "surveys_select_org" ON public.surveys FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "surveys_insert_roles" ON public.surveys FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'pilot', 'inspector')));
CREATE POLICY "surveys_update_assigned_admin" ON public.surveys FOR UPDATE
  USING (pilot_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (pilot_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ── Survey Uploads ──
CREATE POLICY "survey_uploads_select_org" ON public.survey_uploads FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "survey_uploads_insert_roles" ON public.survey_uploads FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('pilot', 'inspector')));
CREATE POLICY "survey_uploads_update_uploader" ON public.survey_uploads FOR UPDATE
  USING (survey_id IN (SELECT id FROM public.surveys WHERE pilot_id = auth.uid()) OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (survey_id IN (SELECT id FROM public.surveys WHERE pilot_id = auth.uid()) OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ── Satellite Observations ──
CREATE POLICY "satellite_observations_select_org" ON public.satellite_observations FOR SELECT
  USING (parcel_id IN (SELECT id FROM public.parcels WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- ── Companion Sessions ──
CREATE POLICY "companion_sessions_select_own" ON public.companion_sessions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "companion_sessions_insert_own" ON public.companion_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "companion_sessions_update_own" ON public.companion_sessions FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Companion Messages ──
CREATE POLICY "companion_messages_select_own_sessions" ON public.companion_messages FOR SELECT
  USING (session_id IN (SELECT id FROM public.companion_sessions WHERE user_id = auth.uid()));
CREATE POLICY "companion_messages_insert_own_sessions" ON public.companion_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.companion_sessions WHERE user_id = auth.uid()));

-- ── Reports ──
CREATE POLICY "reports_select_org" ON public.reports FOR SELECT
  USING (survey_id IN (SELECT id FROM public.surveys WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- ── Shared Reports ──
CREATE POLICY "shared_reports_select" ON public.shared_reports FOR SELECT
  USING (shared_with_email IN (SELECT email FROM public.profiles WHERE id = auth.uid()) OR shared_by = auth.uid());
CREATE POLICY "shared_reports_insert_own" ON public.shared_reports FOR INSERT
  WITH CHECK (shared_by = auth.uid());

-- ── Inspector Survey Access ──
CREATE POLICY "inspector_access_select_own" ON public.inspector_survey_access FOR SELECT
  USING (inspector_id = auth.uid());
CREATE POLICY "inspector_access_insert_admin" ON public.inspector_survey_access FOR INSERT
  WITH CHECK (granted_by IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')) OR granted_by = auth.uid());

-- ── Valuation Reports ──
CREATE POLICY "valuation_reports_select_own" ON public.valuation_reports FOR SELECT
  USING (inspector_id = auth.uid());
CREATE POLICY "valuation_reports_insert_own" ON public.valuation_reports FOR INSERT
  WITH CHECK (inspector_id = auth.uid());
CREATE POLICY "valuation_reports_update_own" ON public.valuation_reports FOR UPDATE
  USING (inspector_id = auth.uid()) WITH CHECK (inspector_id = auth.uid());

-- ── Web Search Results (read-only for authenticated) ──
CREATE POLICY "web_search_select_authenticated" ON public.web_search_results FOR SELECT
  TO authenticated USING (true);

-- ── Curated News (read-only for authenticated) ──
CREATE POLICY "curated_news_select_authenticated" ON public.curated_news FOR SELECT
  TO authenticated USING (true);

-- ── Blog Posts (published posts are public) ──
CREATE POLICY "blog_posts_select_published" ON public.blog_posts FOR SELECT
  TO anon, authenticated USING (status = 'published');

-- ── Identifications (per-user isolation) ──
CREATE POLICY "identifications_select_own" ON public.identifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "identifications_insert_own" ON public.identifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "identifications_update_own" ON public.identifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "identifications_delete_own" ON public.identifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── Service role grants for worker processes ──
GRANT ALL ON public.web_search_results TO service_role;
GRANT ALL ON public.curated_news TO service_role;
GRANT ALL ON public.blog_posts TO service_role;
GRANT ALL ON public.identifications TO service_role;
