-- ============================================================
-- BeetleSense.ai — Seed Data
-- seed.sql
-- ============================================================
-- Note: In a real Supabase environment, auth.users rows are created
-- via the Auth API. For local dev seeding we insert directly.
-- The UUIDs are deterministic for easy cross-referencing.

-- Ensure PostGIS types (geometry, geography) and pgvector resolve correctly
SET search_path TO public, extensions;

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
--    On hosted Supabase, auth.users rows CANNOT be inserted via SQL.
--    Create users via the Auth API or Supabase Dashboard instead.
--    The profile trigger (handle_new_user) auto-creates profiles.
--    Below we seed profiles directly with ON CONFLICT for idempotency.
-- ────────────────────────────────────────────────────────────

-- Skip auth.users on hosted — create these users in Supabase Dashboard:
--   erik.lindgren@varnamo-skog.se  (owner)
--   anna.dronare@varnamo-skog.se   (pilot)
--   karl.inspektor@sydskog.se      (inspector)
--   maja.admin@sydskog.se           (admin)
-- Password: demo-password-123

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

-- ────────────────────────────────────────────────────────────
-- 12. Demo Error Logs & Feedback (Production Readiness Testing)
-- ────────────────────────────────────────────────────────────

-- Sample error logs showing realistic forestry domain errors
INSERT INTO public.error_logs (error_code, module, message, user_id, route, occurred_count, resolved, created_at) VALUES
('DB-001', 'DB', 'Query timeout when fetching parcel boundaries from Lantmäteriet', 'b1000000-0000-0000-0000-000000000001', '/owner/parcels', 2, false, now() - interval '2 hours'),
('MAP-004', 'MAP', 'WMS layer failed to load: Sentinel Hub API rate limit exceeded', 'b2000000-0000-0000-0000-000000000002', '/owner/map', 5, false, now() - interval '30 minutes'),
('SURVEY-002', 'SURVEY', 'Processing job crashed during tree species classification — memory limit', null, '/owner/surveys/d1000000-0000-0000-0000-000000000001', 1, true, now() - interval '1 day'),
('COMPANION-003', 'COMPANION', 'Knowledge retrieval timeout — too many similar documents returned', 'b1000000-0000-0000-0000-000000000001', '/owner/advisor', 1, false, now() - interval '4 hours'),
('UPLOAD-003', 'UPLOAD', 'File upload interrupted: network timeout after 45 seconds', 'b2000000-0000-0000-0000-000000000002', '/owner/gallery', 1, true, now() - interval '3 days');

-- Sample feedback (real demo comments from forestry domain)
INSERT INTO public.feedback (user_id, rating, category, message, screenshot_url, route, app_version, device_type, metadata, reviewed, created_at) VALUES
(null, 3, 'compliment', 'The beetle damage detection on my 45-hectare plot was accurate — saved me weeks of manual scouting!', null, '/owner/map', '0.1.0', 'mobile', '{"browser":"Chrome","platform":"Android"}', true, now() - interval '3 days'),
(null, 1, 'bug', 'GNSS accuracy drops to 50m in dense spruce stands — can''t pinpoint exact damage zones', null, '/owner/survey-detail', '0.1.0', 'mobile', '{"tree_canopy":"dense","gnss_type":"RTK"}', false, now() - interval '2 days'),
(null, 2, 'idea', 'Would love a "harvest timeline" feature — integrate with timber prices to optimize felling decisions', null, '/owner/advisor', '0.1.0', 'desktop', '{"user_role":"owner"}', false, now() - interval '1 day'),
(null, 3, 'compliment', 'The drone pilot matching algorithm found exactly the right inspector for my property in 5 minutes!', null, '/owner/marketplace', '0.1.0', 'mobile', '{"user_role":"owner","marketplace_search":"true"}', true, now() - interval '6 hours'),
(null, 2, 'confusion', 'Report generation took 12 minutes and I got a blank PDF. Not sure what went wrong.', null, '/owner/reports', '0.1.0', 'tablet', '{"report_type":"full_analysis","file_size_mb":"850"}', false, now() - interval '2 hours');

-- Sample admin audit log
INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details, created_at) VALUES
('b4000000-0000-0000-0000-000000000004', 'resolve_error', 'error_log', null, '{"error_code":"SURVEY-002","reason":"Process memory limit increased","deployment":"v0.1.5"}', now() - interval '1 day'),
('b4000000-0000-0000-0000-000000000004', 'review_feedback', 'feedback', null, '{"category":"bug","priority":"high","assignee":"infrastructure"}', now() - interval '12 hours'),
('b4000000-0000-0000-0000-000000000004', 'update_user', 'profile', 'b1000000-0000-0000-0000-000000000001', '{"field":"role","old_value":"owner","new_value":"owner","reason":"role_verification"}', now() - interval '4 hours');

-- ────────────────────────────────────────────────────────────
-- 13. Verify RLS is enabled on all critical tables
-- ────────────────────────────────────────────────────────────

-- Run this query in Supabase Studio to audit RLS:
-- SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public'
--     AND NOT EXISTS (
--       SELECT 1 FROM information_schema.table_constraints
--       WHERE table_name = tablename AND constraint_type = 'POLICY'
--     )
--   ORDER BY tablename;
-- Expected result: EMPTY (all tables have RLS enabled)
