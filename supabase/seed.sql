-- ============================================================
-- BeetleSense.ai — Seed Data
-- seed.sql
-- ============================================================
-- Note: In a real Supabase environment, auth.users rows are created
-- via the Auth API. For local dev seeding we insert directly.
-- The UUIDs are deterministic for easy cross-referencing.

-- ────────────────────────────────────────────────────────────
-- 1. Demo Organizations
-- ────────────────────────────────────────────────────────────

INSERT INTO public.organizations (id, name, slug, org_type, billing_plan, settings) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Värnamo Skogsbruk AB',
  'varnamo-skogsbruk',
  'forest_owner',
  'professional',
  '{"default_crs": "EPSG:3006", "notifications": true}'
),
(
  'a2000000-0000-0000-0000-000000000002',
  'SydSkog Inspektioner',
  'sydskog-inspektioner',
  'inspection_firm',
  'enterprise',
  '{"default_crs": "EPSG:3006", "notifications": true, "custom_report_templates": true}'
);

-- ────────────────────────────────────────────────────────────
-- 2. Demo Auth Users
--    In real Supabase these are created via signUp().
--    For seeding we insert minimal auth.users rows.
-- ────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at) VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'erik.lindgren@varnamo-skog.se',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  '{"provider": "email", "organization_id": "a1000000-0000-0000-0000-000000000001", "role": "owner"}',
  '{"full_name": "Erik Lindgren"}',
  'authenticated',
  'authenticated',
  now(),
  now()
),
(
  'b2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'anna.dronare@varnamo-skog.se',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  '{"provider": "email", "organization_id": "a1000000-0000-0000-0000-000000000001", "role": "pilot"}',
  '{"full_name": "Anna Dronare"}',
  'authenticated',
  'authenticated',
  now(),
  now()
),
(
  'b3000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'karl.inspektor@sydskog.se',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  '{"provider": "email", "organization_id": "a2000000-0000-0000-0000-000000000002", "role": "inspector"}',
  '{"full_name": "Karl Inspektor"}',
  'authenticated',
  'authenticated',
  now(),
  now()
),
(
  'b4000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'maja.admin@sydskog.se',
  crypt('demo-password-123', gen_salt('bf')),
  now(),
  '{"provider": "email", "organization_id": "a2000000-0000-0000-0000-000000000002", "role": "admin"}',
  '{"full_name": "Maja Administratör"}',
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- ────────────────────────────────────────────────────────────
-- 3. Profiles
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, organization_id, role, full_name, email, phone, language, region, onboarded) VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'owner',
  'Erik Lindgren',
  'erik.lindgren@varnamo-skog.se',
  '+46701234567',
  'sv',
  'Jönköpings län',
  true
),
(
  'b2000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'pilot',
  'Anna Dronare',
  'anna.dronare@varnamo-skog.se',
  '+46709876543',
  'sv',
  'Jönköpings län',
  true
),
(
  'b3000000-0000-0000-0000-000000000003',
  'a2000000-0000-0000-0000-000000000002',
  'inspector',
  'Karl Inspektor',
  'karl.inspektor@sydskog.se',
  '+46702223344',
  'sv',
  'Kronobergs län',
  true
),
(
  'b4000000-0000-0000-0000-000000000004',
  'a2000000-0000-0000-0000-000000000002',
  'admin',
  'Maja Administratör',
  'maja.admin@sydskog.se',
  '+46705556677',
  'sv',
  'Kronobergs län',
  true
);

-- ────────────────────────────────────────────────────────────
-- 4. Pilot Profile for Anna
-- ────────────────────────────────────────────────────────────

INSERT INTO public.pilot_profiles (
  id, registration_no, certification, drone_models, sensor_payloads,
  hourly_rate, rating, completed_missions, verified, application_status,
  coverage_area
) VALUES (
  'b2000000-0000-0000-0000-000000000002',
  'SE-UAS-2024-00142',
  'A2 Open Category',
  ARRAY['DJI Matrice 350 RTK', 'DJI Mavic 3 Multispectral'],
  ARRAY['RGB 48MP', 'Multispectral 5-band', 'Thermal IR'],
  1200,
  4.8,
  37,
  true,
  'approved',
  -- Coverage area polygon: roughly Småland region
  ST_SetSRID(ST_MakePolygon(ST_GeomFromText(
    'LINESTRING(13.5 56.8, 15.5 56.8, 15.5 57.8, 13.5 57.8, 13.5 56.8)'
  )), 4326)
);

-- ────────────────────────────────────────────────────────────
-- 5. Parcels — Real Småland forest areas near Värnamo
--    SWEREF99 TM (EPSG:3006) coordinates
--    boundary_wgs84 and centroid are auto-computed by trigger
-- ────────────────────────────────────────────────────────────

-- Parcel 1: Forest NE of Värnamo (~45 ha)
INSERT INTO public.parcels (
  id, organization_id, owner_id, name, fastighets_id,
  boundary, county, municipality, status, metadata
) VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Norrskog Värnamo',
  'Värnamo Bor 3:12',
  ST_SetSRID(ST_GeomFromText(
    'MULTIPOLYGON(((
      434500 6340000,
      435200 6340000,
      435200 6340650,
      434500 6340650,
      434500 6340000
    )))'
  ), 3006),
  'Jönköpings län',
  'Värnamo',
  'active',
  '{"tree_species_dominant": "gran", "terrain": "kuperad", "road_access": true}'
);

-- Parcel 2: Forest S of Värnamo (~30 ha)
INSERT INTO public.parcels (
  id, organization_id, owner_id, name, fastighets_id,
  boundary, county, municipality, status, metadata
) VALUES (
  'c2000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Sydmarkerna',
  'Värnamo Tånnö 5:8',
  ST_SetSRID(ST_GeomFromText(
    'MULTIPOLYGON(((
      432000 6332000,
      432600 6332000,
      432600 6332500,
      432000 6332500,
      432000 6332000
    )))'
  ), 3006),
  'Jönköpings län',
  'Värnamo',
  'active',
  '{"tree_species_dominant": "tall", "terrain": "flack", "road_access": true}'
);

-- Parcel 3: Forest near Bredaryd (~20 ha)
INSERT INTO public.parcels (
  id, organization_id, owner_id, name, fastighets_id,
  boundary, county, municipality, status, metadata
) VALUES (
  'c3000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Bredaryd Östra',
  'Värnamo Bredaryd 2:15',
  ST_SetSRID(ST_GeomFromText(
    'MULTIPOLYGON(((
      420000 6338000,
      420500 6338000,
      420500 6338400,
      420000 6338400,
      420000 6338000
    )))'
  ), 3006),
  'Jönköpings län',
  'Värnamo',
  'active',
  '{"tree_species_dominant": "blandskog", "terrain": "kuperad", "road_access": false}'
);

-- ────────────────────────────────────────────────────────────
-- 6. Parcel Access — Grant inspector access to parcel 1
-- ────────────────────────────────────────────────────────────

INSERT INTO public.parcel_access (parcel_id, user_id, access_level, granted_by) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000003',
  'read',
  'b1000000-0000-0000-0000-000000000001'
);

-- ────────────────────────────────────────────────────────────
-- 7. Surveys
-- ────────────────────────────────────────────────────────────

-- Survey 1: Complete beetle detection survey on parcel 1
INSERT INTO public.surveys (
  id, parcel_id, organization_id, requested_by, pilot_id,
  status, modules, priority, flight_date, notes
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'complete',
  ARRAY['tree_count', 'species_id', 'beetle_detection'],
  'priority',
  '2026-03-01',
  'Misstänkt barkborreangrepp i nordöstra delen. Prioriterad undersökning.'
);

-- Survey 2: Requested boar damage survey on parcel 2 (not yet assigned)
INSERT INTO public.surveys (
  id, parcel_id, organization_id, requested_by,
  status, modules, priority, notes
) VALUES (
  'd2000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'requested',
  ARRAY['animal_inventory', 'boar_damage'],
  'standard',
  'Viltskador rapporterade av granne. Behöver inventering.'
);

-- ────────────────────────────────────────────────────────────
-- 8. Analysis Results for Survey 1
-- ────────────────────────────────────────────────────────────

INSERT INTO public.analysis_results (
  id, survey_id, module, status, started_at, completed_at,
  confidence_score, result_summary, model_version
) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'tree_count',
  'complete',
  '2026-03-02 10:00:00+01',
  '2026-03-02 10:15:00+01',
  0.94,
  '{"total_trees": 12847, "density_per_ha": 285, "canopy_cover_pct": 78.3}',
  'tree-counter-v2.1.0'
),
(
  'e2000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000001',
  'species_id',
  'complete',
  '2026-03-02 10:15:00+01',
  '2026-03-02 10:45:00+01',
  0.87,
  '{"species_distribution": {"gran": 0.62, "tall": 0.25, "bjork": 0.10, "ovriga": 0.03}, "dominant": "gran"}',
  'species-classifier-v1.4.0'
),
(
  'e3000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000001',
  'beetle_detection',
  'complete',
  '2026-03-02 10:45:00+01',
  '2026-03-02 11:30:00+01',
  0.91,
  '{"infested_trees": 23, "risk_zone_area_ha": 2.4, "severity": "moderate", "spread_direction": "NE", "species": "Ips typographus"}',
  'beetle-detect-v3.0.2'
);

-- ────────────────────────────────────────────────────────────
-- 9. Companion Session — Erik asks about beetle spread
-- ────────────────────────────────────────────────────────────

INSERT INTO public.companion_sessions (id, user_id, parcel_id, title) VALUES
(
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'Barkborre — riskbedömning Norrskog'
);

INSERT INTO public.companion_messages (session_id, role, content, sources) VALUES
(
  'f1000000-0000-0000-0000-000000000001',
  'user',
  'Hur allvarligt är barkborreangreppet i Norrskog? Vad bör jag göra härnäst?',
  '[]'
),
(
  'f1000000-0000-0000-0000-000000000001',
  'assistant',
  'Baserat på analysen av din senaste drönarvflygning (2026-03-01) har vi identifierat 23 angripna granar inom ett 2,4 hektar stort riskområde i den nordöstra delen av Norrskog-skiftet. Angreppet klassificeras som "måttligt" och sprider sig i nordöstlig riktning.

**Rekommenderade åtgärder:**
1. **Omedelbart**: Avverka de 23 identifierade angripna träden inom 2 veckor för att minska spridningsrisken
2. **Kort sikt**: Installera feromonfällor i riskzonens periferi (NE-kant)
3. **Uppföljning**: Boka en ny drönarflygning om 4-6 veckor för att övervaka eventuell spridning

Enligt Skogsstyrelsens riktlinjer (SJVFS 2023:14) är du skyldig att vidta åtgärder mot barkborreangrepp. Ska jag hjälpa dig boka en avverkningsentreprenör eller schemalägga en uppföljningsflygning?',
  '[{"type": "analysis", "ref": "e3000000-0000-0000-0000-000000000003", "snippet": "23 infested trees, 2.4ha risk zone", "confidence": 0.91}, {"type": "regulatory", "ref": "sjvfs-2023-14", "snippet": "Skyldighet att bekämpa barkborre vid konstaterat angrepp", "confidence": 0.95}]'
),
(
  'f1000000-0000-0000-0000-000000000001',
  'user',
  'Ja, schemalägg en uppföljningsflygning om 5 veckor.',
  '[]'
);

-- ────────────────────────────────────────────────────────────
-- 10. Sample Satellite Observation
-- ────────────────────────────────────────────────────────────

INSERT INTO public.satellite_observations (
  parcel_id, source, observation_date, cloud_cover_pct,
  ndvi_mean, ndvi_min, ndvi_max, quality, metadata
) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'sentinel2',
  '2026-02-28',
  12.5,
  0.72,
  0.31,
  0.89,
  'good',
  '{"tile_id": "T33VWG", "processing_level": "L2A", "bands_available": ["B02","B03","B04","B08","B11","B12"]}'
),
(
  'c2000000-0000-0000-0000-000000000002',
  'sentinel2',
  '2026-02-28',
  12.5,
  0.81,
  0.65,
  0.91,
  'good',
  '{"tile_id": "T33VWG", "processing_level": "L2A", "bands_available": ["B02","B03","B04","B08","B11","B12"]}'
);

-- ────────────────────────────────────────────────────────────
-- 11. Processing Job record for completed survey
-- ────────────────────────────────────────────────────────────

INSERT INTO public.processing_jobs (
  survey_id, job_type, bullmq_job_id, status, attempts, progress,
  result, started_at, completed_at
) VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'full_analysis_pipeline',
  'bull-job-abc123',
  'completed',
  1,
  100,
  '{"modules_completed": ["tree_count","species_id","beetle_detection"], "total_time_sec": 5400}',
  '2026-03-02 10:00:00+01',
  '2026-03-02 11:30:00+01'
);
