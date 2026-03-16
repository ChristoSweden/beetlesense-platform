-- ============================================================
-- BeetleSense.ai — Foundation Migration
-- 001_foundation.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis       WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"   WITH SCHEMA extensions;

-- Make extension types available in public schema
SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 2. Helper: updated_at trigger function
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 3. Tables
-- ────────────────────────────────────────────────────────────

-- organizations
CREATE TABLE public.organizations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        UNIQUE NOT NULL,
  org_type      text        NOT NULL CHECK (org_type IN ('forest_owner','forestry_company','inspection_firm','research','drone_operator')),
  billing_plan  text        DEFAULT 'starter' CHECK (billing_plan IN ('starter','professional','enterprise')),
  settings      jsonb       DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- profiles (extends auth.users)
CREATE TABLE public.profiles (
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

-- parcels (forest parcels with PostGIS geometry)
CREATE TABLE public.parcels (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  owner_id        uuid        NOT NULL REFERENCES public.profiles(id),
  name            text,
  fastighets_id   text,
  boundary        geometry(MultiPolygon, 3006) NOT NULL,
  boundary_wgs84  geometry(MultiPolygon, 4326),
  area_ha         numeric     GENERATED ALWAYS AS (ST_Area(boundary) / 10000.0) STORED,
  centroid        geometry(Point, 4326),
  county          text,
  municipality    text,
  status          text        DEFAULT 'active' CHECK (status IN ('pending','active','archived')),
  last_sync_at    timestamptz,
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- parcel_open_data (cached open data layers per parcel)
CREATE TABLE public.parcel_open_data (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id     uuid        NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  source        text        NOT NULL,
  data_version  text,
  storage_path  text        NOT NULL,
  fetched_at    timestamptz DEFAULT now(),
  metadata      jsonb       DEFAULT '{}'
);

-- surveys
CREATE TABLE public.surveys (
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

-- survey_uploads
CREATE TABLE public.survey_uploads (
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

-- analysis_results
CREATE TABLE public.analysis_results (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  module            text        NOT NULL CHECK (module IN ('tree_count','species_id','animal_inventory','beetle_detection','boar_damage','module_6')),
  status            text        DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  started_at        timestamptz,
  completed_at      timestamptz,
  confidence_score  numeric     CHECK (confidence_score BETWEEN 0 AND 1),
  result_summary    jsonb       DEFAULT '{}',
  result_geojson    jsonb,
  result_raster_path text,
  model_version     text,
  processing_log    text[],
  created_at        timestamptz DEFAULT now()
);

-- fusion_results
CREATE TABLE public.fusion_results (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  fusion_type       text        NOT NULL,
  input_modules     text[],
  output_summary    jsonb       DEFAULT '{}',
  output_geojson    jsonb,
  output_raster_path text,
  created_at        timestamptz DEFAULT now()
);

-- reports
CREATE TABLE public.reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     uuid        NOT NULL REFERENCES public.surveys(id),
  report_type   text        DEFAULT 'standard' CHECK (report_type IN ('standard','inspector_valuation','insurance_claim','custom')),
  template_id   text,
  language      text        DEFAULT 'sv',
  storage_path  text,
  generated_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- companion_sessions
CREATE TABLE public.companion_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id),
  parcel_id   uuid        REFERENCES public.parcels(id),
  title       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- companion_messages
CREATE TABLE public.companion_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.companion_sessions(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user','assistant','system')),
  content     text        NOT NULL,
  sources     jsonb       DEFAULT '[]',
  created_at  timestamptz DEFAULT now()
);

-- pilot_profiles (extends profiles for drone pilots)
CREATE TABLE public.pilot_profiles (
  id                  uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_no     text,
  certification       text,
  insurance_doc_path  text,
  coverage_area       geometry(Polygon, 4326),
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

-- satellite_observations
CREATE TABLE public.satellite_observations (
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

-- processing_jobs (BullMQ audit trail)
CREATE TABLE public.processing_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid        REFERENCES public.surveys(id),
  job_type        text        NOT NULL,
  bullmq_job_id   text,
  status          text        DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','stalled')),
  attempts        integer     DEFAULT 0,
  progress        numeric     DEFAULT 0,
  result          jsonb,
  error           text,
  created_at      timestamptz DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

-- parcel_access (sharing between users/inspectors)
CREATE TABLE public.parcel_access (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id     uuid        NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level  text        DEFAULT 'read' CHECK (access_level IN ('read','write','admin')),
  granted_by    uuid        REFERENCES public.profiles(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(parcel_id, user_id)
);

-- RAG: research_embeddings
CREATE TABLE public.research_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id    text        NOT NULL,
  chunk_index integer     NOT NULL,
  content     text        NOT NULL,
  embedding   vector(1536),
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(paper_id, chunk_index)
);

-- RAG: regulatory_embeddings
CREATE TABLE public.regulatory_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text        NOT NULL,
  chunk_index integer     NOT NULL,
  content     text        NOT NULL,
  embedding   vector(1536),
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- RAG: user_data_embeddings (per-customer isolated)
CREATE TABLE public.user_data_embeddings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text        NOT NULL,
  source_id   uuid,
  content     text        NOT NULL,
  embedding   vector(1536),
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. Indexes
-- ────────────────────────────────────────────────────────────

-- GIST spatial indexes
CREATE INDEX idx_parcels_boundary          ON public.parcels          USING GIST (boundary);
CREATE INDEX idx_parcels_boundary_wgs84    ON public.parcels          USING GIST (boundary_wgs84);
CREATE INDEX idx_pilot_profiles_coverage   ON public.pilot_profiles   USING GIST (coverage_area);
CREATE INDEX idx_survey_uploads_geo_bounds ON public.survey_uploads   USING GIST (geo_bounds);

-- HNSW vector indexes for RAG embeddings
CREATE INDEX idx_research_embeddings_vec   ON public.research_embeddings   USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_regulatory_embeddings_vec ON public.regulatory_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_user_data_embeddings_vec  ON public.user_data_embeddings  USING hnsw (embedding vector_cosine_ops);

-- B-tree indexes on foreign keys and frequently queried columns
CREATE INDEX idx_profiles_organization_id             ON public.profiles(organization_id);
CREATE INDEX idx_parcels_organization_id              ON public.parcels(organization_id);
CREATE INDEX idx_parcels_owner_id                     ON public.parcels(owner_id);
CREATE INDEX idx_parcel_open_data_parcel_id           ON public.parcel_open_data(parcel_id);
CREATE INDEX idx_surveys_organization_id              ON public.surveys(organization_id);
CREATE INDEX idx_surveys_parcel_id                    ON public.surveys(parcel_id);
CREATE INDEX idx_surveys_status                       ON public.surveys(status);
CREATE INDEX idx_surveys_pilot_id                     ON public.surveys(pilot_id);
CREATE INDEX idx_surveys_requested_by                 ON public.surveys(requested_by);
CREATE INDEX idx_survey_uploads_survey_id             ON public.survey_uploads(survey_id);
CREATE INDEX idx_survey_uploads_organization_id       ON public.survey_uploads(organization_id);
CREATE INDEX idx_analysis_results_survey_module       ON public.analysis_results(survey_id, module);
CREATE INDEX idx_fusion_results_survey_id             ON public.fusion_results(survey_id);
CREATE INDEX idx_reports_survey_id                    ON public.reports(survey_id);
CREATE INDEX idx_companion_sessions_user_id           ON public.companion_sessions(user_id);
CREATE INDEX idx_companion_messages_session_id        ON public.companion_messages(session_id);
CREATE INDEX idx_satellite_obs_parcel_date            ON public.satellite_observations(parcel_id, observation_date DESC);
CREATE INDEX idx_processing_jobs_status               ON public.processing_jobs(status);
CREATE INDEX idx_processing_jobs_survey_id            ON public.processing_jobs(survey_id);
CREATE INDEX idx_parcel_access_parcel_id              ON public.parcel_access(parcel_id);
CREATE INDEX idx_parcel_access_user_id                ON public.parcel_access(user_id);
CREATE INDEX idx_user_data_embeddings_user_id         ON public.user_data_embeddings(user_id);

-- ────────────────────────────────────────────────────────────
-- 5. Triggers: updated_at
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_parcels
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_surveys
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_companion_sessions
  BEFORE UPDATE ON public.companion_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pilot_profiles
  BEFORE UPDATE ON public.pilot_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 6. Trigger: auto-compute boundary_wgs84 + centroid from boundary
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_parcel_wgs84()
RETURNS TRIGGER AS $$
BEGIN
  -- Transform SWEREF99 TM (EPSG:3006) to WGS84 (EPSG:4326)
  NEW.boundary_wgs84 := ST_Transform(NEW.boundary, 4326);
  NEW.centroid := ST_Centroid(ST_Transform(NEW.boundary, 4326));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_parcels_compute_wgs84
  BEFORE INSERT OR UPDATE OF boundary ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.compute_parcel_wgs84();
