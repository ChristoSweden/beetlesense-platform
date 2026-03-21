# Database Schema Reference

> Complete schema documentation for BeetleSense.ai.
> Database: Supabase (PostgreSQL 15 + PostGIS + pgvector).
> All spatial data in SWEREF99 TM (EPSG:3006) unless noted.

---

## Table of Contents

1. [Extensions](#extensions)
2. [Core Tables](#core-tables)
3. [Survey & Analysis Tables](#survey--analysis-tables)
4. [Knowledge Base (RAG) Tables](#knowledge-base-rag-tables)
5. [Alerts & Notifications](#alerts--notifications)
6. [Sharing & Collaboration](#sharing--collaboration)
7. [Community Tables](#community-tables)
8. [Marketplace Tables](#marketplace-tables)
9. [Compliance & Permits](#compliance--permits)
10. [Forest Archive](#forest-archive)
11. [Knowledge Notes](#knowledge-notes)
12. [Document Vault](#document-vault)
13. [Quote Requests](#quote-requests)
14. [Sensor & Fusion Products](#sensor--fusion-products)
15. [Pilot Job Lifecycle](#pilot-job-lifecycle)
16. [DJI Integration](#dji-integration)
17. [Airspace Compliance](#airspace-compliance)
18. [Billing & Subscriptions](#billing--subscriptions)
19. [NEW: Feedback](#new-feedback)
20. [NEW: Error Logs](#new-error-logs)
21. [NEW: Admin Audit Log](#new-admin-audit-log)
22. [Relationships Diagram](#relationships-diagram)
23. [Seed Data Strategy](#seed-data-strategy)

---

## Extensions

Defined in `supabase/migrations/000_extensions.sql`:

| Extension      | Schema     | Purpose                                              |
|----------------|------------|------------------------------------------------------|
| `postgis`      | extensions | Spatial data types (geometry, geography, ST_*)       |
| `vector`       | extensions | pgvector for RAG embedding similarity search         |
| `pg_cron`      | extensions | Scheduled background jobs                            |
| `moddatetime`  | extensions | Automatic `updated_at` timestamp management          |
| `uuid-ossp`    | extensions | UUID generation functions                            |

---

## Core Tables

Migration: `001_core_schema.sql`

### organizations

Represents a company, firm, or individual account.

| Column        | Type        | Nullable | Default        | Notes |
|---------------|-------------|----------|----------------|-------|
| id            | uuid        | NO       | gen_random_uuid() | PK |
| name          | text        | NO       |                |       |
| slug          | text        | NO       |                | UNIQUE |
| org_type      | text        | NO       |                | CHECK: forest_owner, forestry_company, inspection_firm, research, drone_operator |
| billing_plan  | text        | YES      | 'starter'      | CHECK: starter, professional, enterprise |
| settings      | jsonb       | YES      | '{}'           |       |
| created_at    | timestamptz | YES      | now()          |       |
| updated_at    | timestamptz | YES      | now()          | Trigger: handle_updated_at |

**Indexes**: none beyond PK + unique slug.
**RLS**: enabled (org-member policies in later migrations).

---

### profiles

Extends `auth.users` with application-specific data.

| Column          | Type        | Nullable | Default   | Notes |
|-----------------|-------------|----------|-----------|-------|
| id              | uuid        | NO       |           | PK, FK -> auth.users(id) ON DELETE CASCADE |
| organization_id | uuid        | YES      |           | FK -> organizations(id) |
| role            | text        | NO       |           | CHECK: owner, pilot, inspector, admin |
| full_name       | text        | YES      |           |       |
| email           | text        | YES      |           |       |
| phone           | text        | YES      |           |       |
| avatar_url      | text        | YES      |           |       |
| language        | text        | YES      | 'sv'      |       |
| region          | text        | YES      |           |       |
| onboarded       | boolean     | YES      | false     |       |
| created_at      | timestamptz | YES      | now()     |       |
| updated_at      | timestamptz | YES      | now()     | Trigger: handle_updated_at |

**Indexes**: `idx_profiles_organization_id(organization_id)`
**Trigger**: `on_auth_user_created` -> auto-creates profile row from auth.users insert.
**RLS**: enabled.
**RLS Policies**:
- `profiles_select_own`: users can read own profile.
- `profiles_select_org`: users can read profiles in same org.
- `profiles_update_own`: users can update own profile.

---

### pilot_profiles

Extended profile data for drone pilots.

| Column              | Type                   | Nullable | Default     | Notes |
|---------------------|------------------------|----------|-------------|-------|
| id                  | uuid                   | NO       |             | PK, FK -> profiles(id) ON DELETE CASCADE |
| registration_no     | text                   | YES      |             |       |
| certification       | text                   | YES      |             |       |
| insurance_doc_path  | text                   | YES      |             |       |
| coverage_area       | geometry(Polygon,4326) | YES      |             | WGS84 for map display |
| drone_models        | text[]                 | YES      |             |       |
| sensor_payloads     | text[]                 | YES      |             |       |
| sample_work_paths   | text[]                 | YES      |             |       |
| hourly_rate         | numeric                | YES      |             |       |
| rating              | numeric                | YES      | 0           |       |
| completed_missions  | integer                | YES      | 0           |       |
| verified            | boolean                | YES      | false       |       |
| application_status  | text                   | YES      | 'submitted' | CHECK: submitted, review, approved, rejected |
| created_at          | timestamptz            | YES      | now()       |       |
| updated_at          | timestamptz            | YES      | now()       | Trigger: handle_updated_at |

**Indexes**: `idx_pilot_profiles_coverage` GIST(coverage_area)
**RLS**: enabled.

---

### user_preferences

Per-user notification and app preferences.

| Column             | Type        | Nullable | Default  | Notes |
|--------------------|-------------|----------|----------|-------|
| id                 | uuid        | NO       | gen_random_uuid() | PK |
| user_id            | uuid        | NO       |          | FK -> profiles(id), UNIQUE |
| notification_prefs | jsonb       | YES      | `{survey_complete: true, new_job_available: true, report_shared: true, marketing_updates: false}` | |
| created_at         | timestamptz | YES      | now()    |       |
| updated_at         | timestamptz | YES      | now()    | Trigger: handle_updated_at |

**RLS**: enabled.

---

### parcels

Forest parcels with PostGIS geometry. Boundaries stored in SWEREF99 TM.

| Column          | Type                          | Nullable | Default   | Notes |
|-----------------|-------------------------------|----------|-----------|-------|
| id              | uuid                          | NO       | gen_random_uuid() | PK |
| organization_id | uuid                          | NO       |           | FK -> organizations(id) |
| owner_id        | uuid                          | NO       |           | FK -> profiles(id) |
| name            | text                          | YES      |           |       |
| fastighets_id   | text                          | YES      |           | Swedish cadastral ID (fastighetsbeteckning) |
| boundary        | geometry(MultiPolygon, 3006)  | NO       |           | SWEREF99 TM |
| boundary_wgs84  | geometry(MultiPolygon, 4326)  | YES      |           | Auto-computed by trigger |
| area_ha         | numeric                       | GENERATED|           | `ST_Area(boundary) / 10000.0` STORED |
| centroid        | geometry(Point, 4326)         | YES      |           | Auto-computed by trigger |
| county          | text                          | YES      |           |       |
| municipality    | text                          | YES      |           |       |
| status          | text                          | YES      | 'active'  | CHECK: pending, active, archived |
| last_sync_at    | timestamptz                   | YES      |           |       |
| metadata        | jsonb                         | YES      | '{}'      |       |
| created_at      | timestamptz                   | YES      | now()     |       |
| updated_at      | timestamptz                   | YES      | now()     | Trigger: handle_updated_at |

**Indexes**:
- `idx_parcels_boundary` GIST(boundary)
- `idx_parcels_boundary_wgs84` GIST(boundary_wgs84)
- `idx_parcels_organization_id(organization_id)`
- `idx_parcels_owner_id(owner_id)`

**Triggers**:
- `trg_parcels_compute_wgs84`: auto-computes `boundary_wgs84` and `centroid` via ST_Transform.

**RLS**: enabled.
**RLS Policies**:
- `parcels_select_org`: users can read parcels in their org.
- `parcels_select_shared`: users with `parcel_access` can read.
- `parcels_insert_org`: org members (owner/admin) can create.
- `parcels_update_own`: parcel owner can update.
- `parcels_delete_own`: parcel owner can delete.

---

### parcel_open_data

Cached external data layers fetched per parcel (Lantmateriet, SGU, Skogsstyrelsen, SMHI, SLU).

| Column       | Type        | Nullable | Default | Notes |
|--------------|-------------|----------|---------|-------|
| id           | uuid        | NO       | gen_random_uuid() | PK |
| parcel_id    | uuid        | NO       |         | FK -> parcels(id) ON DELETE CASCADE |
| source       | text        | NO       |         | e.g., 'lantmateriet', 'sgu', 'skogsstyrelsen' |
| data_version | text        | YES      |         |       |
| storage_path | text        | NO       |         |       |
| fetched_at   | timestamptz | YES      | now()   |       |
| metadata     | jsonb       | YES      | '{}'    |       |

**Indexes**: `idx_parcel_open_data_parcel_id(parcel_id)`

---

### parcel_access

Granular sharing between individual users and parcels.

| Column       | Type        | Nullable | Default  | Notes |
|--------------|-------------|----------|----------|-------|
| id           | uuid        | NO       | gen_random_uuid() | PK |
| parcel_id    | uuid        | NO       |          | FK -> parcels(id) ON DELETE CASCADE |
| user_id      | uuid        | NO       |          | FK -> profiles(id) ON DELETE CASCADE |
| access_level | text        | YES      | 'read'   | CHECK: read, write, admin |
| granted_by   | uuid        | YES      |          | FK -> profiles(id) |
| created_at   | timestamptz | YES      | now()    |       |

**Indexes**: `idx_parcel_access_parcel_id`, `idx_parcel_access_user_id`
**Unique**: `(parcel_id, user_id)`

---

## Survey & Analysis Tables

### surveys

Migration: `001_core_schema.sql`

| Column          | Type        | Nullable | Default   | Notes |
|-----------------|-------------|----------|-----------|-------|
| id              | uuid        | NO       | gen_random_uuid() | PK |
| parcel_id       | uuid        | NO       |           | FK -> parcels(id) |
| organization_id | uuid        | NO       |           | FK -> organizations(id) |
| requested_by    | uuid        | NO       |           | FK -> profiles(id) |
| pilot_id        | uuid        | YES      |           | FK -> profiles(id) |
| status          | text        | NO       | 'draft'   | CHECK: draft, requested, assigned, flying, uploading, processing, review, complete, failed |
| modules         | text[]      | NO       | '{}'      | Array of module IDs |
| priority        | text        | YES      | 'standard'| CHECK: standard, priority |
| sla_deadline    | timestamptz | YES      |           |       |
| flight_date     | date        | YES      |           |       |
| notes           | text        | YES      |           |       |
| metadata        | jsonb       | YES      | '{}'      |       |
| created_at      | timestamptz | YES      | now()     |       |
| updated_at      | timestamptz | YES      | now()     | Trigger: handle_updated_at |

**Indexes**: `organization_id`, `parcel_id`, `status`, `pilot_id`, `requested_by`
**RLS**: enabled.

---

### survey_uploads

Files uploaded for a survey (drone images, LiDAR, e-nose CSVs, etc.).

| Column            | Type                   | Nullable | Default   | Notes |
|-------------------|------------------------|----------|-----------|-------|
| id                | uuid                   | NO       | gen_random_uuid() | PK |
| survey_id         | uuid                   | NO       |           | FK -> surveys(id) ON DELETE CASCADE |
| organization_id   | uuid                   | NO       |           | FK -> organizations(id) |
| upload_type       | text                   | NO       |           | CHECK: drone_rgb, drone_multispectral, drone_thermal, drone_lidar, enose_csv, smartphone_photo, flight_log |
| storage_path      | text                   | NO       |           |       |
| original_filename | text                   | YES      |           |       |
| file_size_bytes   | bigint                 | YES      |           |       |
| checksum_sha256   | text                   | YES      |           |       |
| geo_bounds        | geometry(Polygon,4326) | YES      |           |       |
| status            | text                   | YES      | 'pending' | CHECK: pending, validating, ready, invalid, processing, error |
| metadata          | jsonb                  | YES      | '{}'      |       |
| created_at        | timestamptz            | YES      | now()     |       |

**Indexes**: `survey_id`, `organization_id`, GIST(`geo_bounds`)
**RLS**: enabled.

---

### analysis_results

Migration: `002_analysis.sql`. Per-module AI inference outputs.

| Column           | Type        | Nullable | Default   | Notes |
|------------------|-------------|----------|-----------|-------|
| id               | uuid        | NO       | gen_random_uuid() | PK |
| survey_id        | uuid        | NO       |           | FK -> surveys(id) ON DELETE CASCADE |
| module           | text        | NO       |           | CHECK: tree_count, species_id, animal_inventory, beetle_detection, boar_damage, module_6 |
| status           | text        | YES      | 'queued'  | CHECK: queued, running, complete, failed |
| started_at       | timestamptz | YES      |           |       |
| completed_at     | timestamptz | YES      |           |       |
| confidence_score | numeric     | YES      |           | CHECK: 0-1 |
| result_summary   | jsonb       | YES      | '{}'      |       |
| result_geojson   | jsonb       | YES      |           |       |
| result_raster_path| text       | YES      |           |       |
| model_version    | text        | YES      |           |       |
| processing_log   | text[]      | YES      |           |       |
| created_at       | timestamptz | YES      | now()     |       |

**Indexes**: `idx_analysis_results_survey_module(survey_id, module)`
**RLS**: enabled. Policy: visible to same-org members via survey lookup.

---

### fusion_results

Migration: `002_analysis.sql`. Multi-module combined outputs.

| Column            | Type        | Nullable | Default | Notes |
|-------------------|-------------|----------|---------|-------|
| id                | uuid        | NO       | gen_random_uuid() | PK |
| survey_id         | uuid        | NO       |         | FK -> surveys(id) ON DELETE CASCADE |
| fusion_type       | text        | NO       |         |       |
| input_modules     | text[]      | YES      |         |       |
| output_summary    | jsonb       | YES      | '{}'    |       |
| output_geojson    | jsonb       | YES      |         |       |
| output_raster_path| text        | YES      |         |       |
| created_at        | timestamptz | YES      | now()   |       |

**Indexes**: `idx_fusion_results_survey_id(survey_id)`
**RLS**: enabled. Same-org visibility via survey.

---

### processing_jobs

Migration: `002_analysis.sql`. BullMQ audit trail.

| Column         | Type        | Nullable | Default   | Notes |
|----------------|-------------|----------|-----------|-------|
| id             | uuid        | NO       | gen_random_uuid() | PK |
| survey_id      | uuid        | YES      |           | FK -> surveys(id) |
| job_type       | text        | NO       |           |       |
| bullmq_job_id  | text        | YES      |           |       |
| status         | text        | YES      | 'pending' | CHECK: pending, active, completed, failed, stalled |
| attempts       | integer     | YES      | 0         |       |
| progress       | numeric     | YES      | 0         |       |
| result         | jsonb       | YES      |           |       |
| error          | text        | YES      |           |       |
| created_at     | timestamptz | YES      | now()     |       |
| started_at     | timestamptz | YES      |           |       |
| completed_at   | timestamptz | YES      |           |       |

**Indexes**: `status`, `survey_id`
**RLS**: enabled. Same-org visibility via survey.

---

### satellite_observations

Migration: `001_core_schema.sql`. Satellite health monitoring data per parcel.

| Column           | Type        | Nullable | Default | Notes |
|------------------|-------------|----------|---------|-------|
| id               | uuid        | NO       | gen_random_uuid() | PK |
| parcel_id        | uuid        | NO       |         | FK -> parcels(id) ON DELETE CASCADE |
| source           | text        | NO       |         | CHECK: sentinel2, sentinel1_sar, landsat, modis |
| observation_date | date        | NO       |         |       |
| cloud_cover_pct  | numeric     | YES      |         |       |
| ndvi_mean        | numeric     | YES      |         |       |
| ndvi_min         | numeric     | YES      |         |       |
| ndvi_max         | numeric     | YES      |         |       |
| band_data_path   | text        | YES      |         |       |
| thumbnail_path   | text        | YES      |         |       |
| quality          | text        | YES      | 'good'  | CHECK: good, moderate, poor |
| metadata         | jsonb       | YES      | '{}'    |       |
| created_at       | timestamptz | YES      | now()   |       |

**Indexes**: `idx_satellite_obs_parcel_date(parcel_id, observation_date DESC)`
**RLS**: enabled.

---

### companion_sessions

Migration: `001_core_schema.sql`. AI companion chat sessions.

| Column     | Type        | Nullable | Default   | Notes |
|------------|-------------|----------|-----------|-------|
| id         | uuid        | NO       | gen_random_uuid() | PK |
| user_id    | uuid        | NO       |           | FK -> profiles(id) |
| parcel_id  | uuid        | YES      |           | FK -> parcels(id) |
| title      | text        | YES      |           |       |
| created_at | timestamptz | YES      | now()     |       |
| updated_at | timestamptz | YES      | now()     | Trigger: handle_updated_at |

**Indexes**: `idx_companion_sessions_user_id(user_id)`
**RLS**: enabled.

---

### companion_messages

Individual messages within a companion session.

| Column     | Type        | Nullable | Default | Notes |
|------------|-------------|----------|---------|-------|
| id         | uuid        | NO       | gen_random_uuid() | PK |
| session_id | uuid        | NO       |         | FK -> companion_sessions(id) ON DELETE CASCADE |
| role       | text        | NO       |         | CHECK: user, assistant, system |
| content    | text        | NO       |         |       |
| sources    | jsonb       | YES      | '[]'    | Citation data |
| created_at | timestamptz | YES      | now()   |       |

**Indexes**: `idx_companion_messages_session_id(session_id)`
**RLS**: enabled.

---

### reports

Generated PDF/HTML reports from survey analysis.

| Column         | Type        | Nullable | Default     | Notes |
|----------------|-------------|----------|-------------|-------|
| id             | uuid        | NO       | gen_random_uuid() | PK |
| survey_id      | uuid        | NO       |             | FK -> surveys(id) |
| report_type    | text        | YES      | 'standard'  | CHECK: standard, inspector_valuation, insurance_claim, custom |
| template_id    | text        | YES      |             |       |
| language       | text        | YES      | 'sv'        |       |
| storage_path   | text        | YES      |             |       |
| generated_at   | timestamptz | YES      |             |       |
| title          | text        | YES      |             | Auto-populated by trigger |
| owner_id       | uuid        | YES      |             | FK -> profiles(id), auto-populated |
| parcel_name    | text        | YES      |             | Auto-populated by trigger |
| status         | text        | YES      | 'draft'     | CHECK: draft, generated, shared |
| pdf_url        | text        | YES      |             |       |
| inspector_name | text        | YES      |             |       |
| created_at     | timestamptz | YES      | now()       |       |

**Indexes**: `survey_id`, `owner_id`
**Trigger**: `trg_reports_set_defaults` auto-populates title, owner_id, parcel_name from survey.
**RLS**: enabled.

---

### shared_reports

Track which reports have been shared by email.

| Column            | Type        | Nullable | Default | Notes |
|-------------------|-------------|----------|---------|-------|
| id                | uuid        | NO       | gen_random_uuid() | PK |
| report_id         | uuid        | NO       |         | FK -> reports(id) ON DELETE CASCADE |
| shared_by         | uuid        | NO       |         | FK -> profiles(id) |
| shared_with_email | text        | NO       |         |       |
| shared_at         | timestamptz | YES      | now()   |       |

**Indexes**: `idx_shared_reports_email(shared_with_email)`
**Unique**: `(report_id, shared_with_email)`

---

### inspector_survey_access

Grants inspectors access to specific surveys.

| Column       | Type        | Nullable | Default | Notes |
|--------------|-------------|----------|---------|-------|
| id           | uuid        | NO       | gen_random_uuid() | PK |
| inspector_id | uuid        | NO       |         | FK -> profiles(id) ON DELETE CASCADE |
| survey_id    | uuid        | NO       |         | FK -> surveys(id) ON DELETE CASCADE |
| access_level | text        | YES      | 'read'  | CHECK: read, review, admin |
| granted_by   | uuid        | YES      |         | FK -> profiles(id) |
| created_at   | timestamptz | YES      | now()   |       |

**Unique**: `(inspector_id, survey_id)`

---

### valuation_reports

Inspector-specific valuation reports.

| Column         | Type        | Nullable | Default | Notes |
|----------------|-------------|----------|---------|-------|
| id             | uuid        | NO       | gen_random_uuid() | PK |
| inspector_id   | uuid        | NO       |         | FK -> profiles(id) |
| survey_id      | uuid        | NO       |         | FK -> surveys(id) |
| parcel_name    | text        | YES      |         |       |
| client_name    | text        | YES      |         |       |
| status         | text        | YES      | 'draft' | CHECK: draft, in_progress, review, complete |
| valuation_data | jsonb       | YES      | '{}'    |       |
| storage_path   | text        | YES      |         |       |
| created_at     | timestamptz | YES      | now()   |       |
| updated_at     | timestamptz | YES      | now()   | Trigger: handle_updated_at |

**Indexes**: `idx_valuation_reports_inspector(inspector_id)`

---

### web_search_results

Cached web search results for AI companion research.

| Column       | Type        | Nullable | Default  | Notes |
|--------------|-------------|----------|----------|-------|
| id           | uuid        | NO       | gen_random_uuid() | PK |
| query        | text        | NO       |          |       |
| provider     | text        | NO       | 'brave'  |       |
| url          | text        | NO       |          | UNIQUE |
| title        | text        | NO       |          |       |
| snippet      | text        | YES      |          |       |
| published_at | timestamptz | YES      |          |       |
| raw_payload  | jsonb       | YES      |          |       |
| fetched_at   | timestamptz | NO       | now()    |       |
| created_at   | timestamptz | NO       | now()    |       |

**Indexes**: `idx_web_search_fetched(fetched_at DESC)`, GIN full-text on `query || title`.

---

### curated_news

Curated forestry news feed.

| Column          | Type        | Nullable | Default    | Notes |
|-----------------|-------------|----------|------------|-------|
| id              | uuid        | NO       | gen_random_uuid() | PK |
| source_url      | text        | NO       |            |       |
| title           | text        | NO       |            |       |
| summary         | text        | YES      |            |       |
| category        | text        | NO       | 'general'  |       |
| relevance_score | real        | NO       | 0          |       |
| recency_score   | real        | NO       | 0          |       |
| combined_score  | real        | NO       | 0          |       |
| image_url       | text        | YES      |            |       |
| language        | text        | NO       | 'en'       |       |
| published_at    | timestamptz | YES      |            |       |
| expires_at      | timestamptz | YES      |            |       |

---

## Knowledge Base (RAG) Tables

Migration: `003_knowledge_base.sql`, `013_google_embeddings.sql`

All embedding columns use **768 dimensions** (Google text-embedding-004, migrated from 1536 OpenAI in migration 013).

### research_embeddings

Chunked embeddings from forestry research papers.

| Column      | Type        | Nullable | Default | Notes |
|-------------|-------------|----------|---------|-------|
| id          | uuid        | NO       | gen_random_uuid() | PK |
| paper_id    | text        | NO       |         | External paper identifier |
| chunk_index | integer     | NO       |         | Position within paper |
| content     | text        | NO       |         | Raw text chunk |
| embedding   | vector(768) | YES      |         | Google text-embedding-004 |
| metadata    | jsonb       | YES      | '{}'    | {title, authors, year, journal, doi} |
| created_at  | timestamptz | YES      | now()   |       |

**Indexes**: `idx_research_embeddings_vec` HNSW(embedding vector_cosine_ops)
**Unique**: `(paper_id, chunk_index)`
**RLS**: enabled. All authenticated users can read (public knowledge base).

---

### regulatory_embeddings

Chunked embeddings from Swedish regulatory documents.

| Column      | Type        | Nullable | Default | Notes |
|-------------|-------------|----------|---------|-------|
| id          | uuid        | NO       | gen_random_uuid() | PK |
| source      | text        | NO       |         | e.g., 'sjvfs-2023-14', 'sks-2024-01' |
| chunk_index | integer     | NO       |         |       |
| content     | text        | NO       |         |       |
| embedding   | vector(768) | YES      |         | Google text-embedding-004 |
| metadata    | jsonb       | YES      | '{}'    | {title, authority, effective_date, section} |
| created_at  | timestamptz | YES      | now()   |       |

**Indexes**: `idx_regulatory_embeddings_vec` HNSW(embedding vector_cosine_ops)
**RLS**: enabled. All authenticated users can read.

---

### user_data_embeddings

Per-user embeddings from survey results, conversations, and documents. Strict RLS isolation.

| Column      | Type        | Nullable | Default | Notes |
|-------------|-------------|----------|---------|-------|
| id          | uuid        | NO       | gen_random_uuid() | PK |
| user_id     | uuid        | NO       |         | FK -> profiles(id) ON DELETE CASCADE |
| source_type | text        | NO       |         | survey_result, companion_chat, document |
| source_id   | uuid        | YES      |         | FK to source record |
| content     | text        | NO       |         |       |
| embedding   | vector(768) | YES      |         | Google text-embedding-004 |
| metadata    | jsonb       | YES      | '{}'    |       |
| created_at  | timestamptz | YES      | now()   |       |

**Indexes**: HNSW(embedding), `user_id`
**RLS**: enabled.
**RLS Policies**:
- `user_data_embeddings_select_own`: user_id = auth.uid()
- `user_data_embeddings_insert_own`: user_id = auth.uid()
- `user_data_embeddings_delete_own`: user_id = auth.uid()

---

## Alerts & Notifications

Migration: `004_alerts.sql`

### alerts

| Column          | Type            | Nullable | Default | Notes |
|-----------------|-----------------|----------|---------|-------|
| id              | uuid            | NO       | gen_random_uuid() | PK |
| user_id         | uuid            | NO       |         | FK -> auth.users(id) ON DELETE CASCADE |
| organization_id | uuid            | YES      |         | FK -> organizations(id) |
| category        | alert_category  | NO       |         | ENUM: BEETLE_SEASON, STORM_WARNING, NDVI_DROP, HARVEST_WINDOW, FROST_RISK, DROUGHT_STRESS, REGULATORY_DEADLINE |
| severity        | alert_severity  | NO       | 'info'  | ENUM: info, warning, critical |
| title           | text            | NO       |         |       |
| message         | text            | NO       |         |       |
| metadata        | jsonb           | NO       | '{}'    |       |
| parcel_id       | uuid            | YES      |         | FK -> parcels(id) |
| parcel_name     | text            | YES      |         |       |
| is_read         | boolean         | NO       | false   |       |
| is_dismissed    | boolean         | NO       | false   |       |
| created_at      | timestamptz     | NO       | now()   |       |
| read_at         | timestamptz     | YES      |         |       |
| dismissed_at    | timestamptz     | YES      |         |       |

**Indexes**: `user_id`, `user_id WHERE NOT read AND NOT dismissed`, `created_at DESC`, `category`, `severity`, `parcel_id`
**RLS**: enabled. Users see own alerts only. Service role can insert.
**Realtime**: subscribed via `supabase_realtime`.

---

### push_notifications

Worker delivery queue for web push / FCM / APNs.

| Column     | Type        | Nullable | Default   | Notes |
|------------|-------------|----------|-----------|-------|
| id         | uuid        | NO       | gen_random_uuid() | PK |
| user_id    | uuid        | NO       |           | FK -> auth.users(id) ON DELETE CASCADE |
| title      | text        | NO       |           |       |
| body       | text        | NO       |           |       |
| data       | jsonb       | NO       | '{}'      |       |
| status     | text        | NO       | 'pending' | CHECK: pending, sent, failed |
| created_at | timestamptz | NO       | now()     |       |
| sent_at    | timestamptz | YES      |           |       |

**Indexes**: `idx_push_notifications_pending(status) WHERE status = 'pending'`
**RLS**: enabled. Service role insert only.

---

## Sharing & Collaboration

Migration: `005_sharing.sql`

### parcel_shares

Invitation-based parcel sharing with roles, tokens, passwords, and expiry.

| Column        | Type         | Nullable | Default   | Notes |
|---------------|--------------|----------|-----------|-------|
| id            | uuid         | NO       | gen_random_uuid() | PK |
| parcel_id     | uuid         | NO       |           | FK -> parcels(id) ON DELETE CASCADE |
| user_id       | uuid         | YES      |           | FK -> auth.users(id), NULL until accepted |
| invited_email | text         | NO       |           |       |
| role          | share_role   | NO       | 'viewer'  | ENUM: viewer, commenter, editor, admin |
| status        | share_status | NO       | 'pending' | ENUM: pending, accepted, rejected |
| invited_by    | uuid         | NO       |           | FK -> auth.users(id) |
| share_token   | text         | YES      |           | UNIQUE, for link-based sharing |
| password_hash | text         | YES      |           |       |
| expires_at    | timestamptz  | YES      |           |       |
| accepted_at   | timestamptz  | YES      |           |       |
| created_at    | timestamptz  | NO       | now()     |       |
| updated_at    | timestamptz  | NO       | now()     | Trigger: handle_updated_at |

**Indexes**: `parcel_id`, `user_id`, `invited_email`, `share_token`, unique composite on `(parcel_id, user_id)` and `(parcel_id, invited_email)` where pending.
**RLS**: enabled. Complex policies for owner, self, admin roles.
**Realtime**: subscribed.

---

## Community Tables

Migration: `006_community.sql`

### community_posts

| Column        | Type                    | Nullable | Default    | Notes |
|---------------|-------------------------|----------|------------|-------|
| id            | uuid                    | NO       | gen_random_uuid() | PK |
| author_id     | uuid                    | NO       |            | FK -> profiles(id) |
| title         | text                    | NO       |            |       |
| body          | text                    | NO       |            |       |
| category      | text                    | NO       | 'general'  | CHECK: general, beetle_alert, storm_damage, best_practice, question, market_update |
| tags          | text[]                  | YES      | '{}'       |       |
| image_urls    | text[]                  | YES      | '{}'       |       |
| location      | geometry(Point, 3006)   | YES      |            | SWEREF99 TM |
| county        | text                    | YES      |            |       |
| municipality  | text                    | YES      |            |       |
| is_pinned     | boolean                 | NO       | false      |       |
| is_hidden     | boolean                 | NO       | false      | Moderation flag |
| like_count    | integer                 | NO       | 0          | Auto-incremented by trigger |
| comment_count | integer                 | NO       | 0          | Auto-incremented by trigger |
| created_at    | timestamptz             | NO       | now()      |       |
| updated_at    | timestamptz             | NO       | now()      |       |

**Indexes**: `author_id`, `(category, created_at DESC)`, `county`, GIST(`location`), GIN(`tags`)
**RLS**: authenticated users can read non-hidden, authors can CRUD own.

### community_comments

Threaded comments with `parent_id` self-reference. Auto-increments `community_posts.comment_count`.

### community_likes

Unique constraint on `(post_id, user_id)`. Auto-increments `community_posts.like_count`.

---

## Marketplace Tables

Migration: `007_marketplace.sql`

### marketplace_listings

Service provider offerings (drone surveys, harvesting, consulting, etc.).

| Column        | Type                   | Nullable | Default  | Notes |
|---------------|------------------------|----------|----------|-------|
| id            | uuid                   | NO       | gen_random_uuid() | PK |
| provider_id   | uuid                   | NO       |          | FK -> profiles(id) |
| organization_id| uuid                  | YES      |          | FK -> organizations(id) |
| title         | text                   | NO       |          |       |
| description   | text                   | NO       |          |       |
| category      | text                   | NO       |          | CHECK: drone_survey, harvesting, planting, inspection, consulting, transport, other |
| price_type    | text                   | NO       | 'fixed'  | CHECK: fixed, hourly, per_hectare, quote |
| price_amount  | numeric                | YES      |          |       |
| currency      | text                   | NO       | 'SEK'    |       |
| coverage_area | geometry(Polygon,4326) | YES      |          |       |
| county        | text                   | YES      |          |       |
| is_active     | boolean                | NO       | true     |       |
| rating_avg    | numeric                | YES      | 0        | Auto-computed from reviews |
| review_count  | integer                | YES      | 0        | Auto-computed from reviews |

**RLS**: authenticated can browse active; providers CRUD own.

### marketplace_bookings

Service bookings with status lifecycle: pending -> confirmed -> in_progress -> completed.

### marketplace_reviews

Post-booking reviews. Trigger auto-updates `rating_avg` and `review_count` on listing.

---

## Compliance & Permits

Migration: `008_compliance.sql`

### felling_permits

Swedish felling permit tracking (avverkningsanmalan). Tracks 6-week mandatory notification to Skogsstyrelsen.

Key columns: `permit_type` (final_felling, thinning, sanitation_felling, etc.), `skogsstyrelsen_ref`, `status` (draft -> submitted -> acknowledged -> approved), `felling_area` geometry, `notification_period_ends`, environmental flags (`key_biotope`, `water_protection`, `cultural_heritage`).

### permit_documents

Supporting documents attached to felling permits.

---

## Forest Archive

Migration: `009_archive.sql`

### forest_archive_events

Historical timeline events per parcel. Types: planting, thinning, final_felling, storm_damage, fire, beetle_outbreak, ownership_transfer, certification, etc. Supports spatial data and media attachments.

### family_stewards

Multi-generational stewardship records. Links family members to parcels with `start_year`/`end_year` for lineage tracking.

---

## Knowledge Notes

Migration: `010_knowledge_notes.sql`

### knowledge_notes

Voice/text/photo notes attached to parcels. Supports audio recording with AI transcription. Categories: general, observation, reminder, action_item, meeting_note, historical. Spatial location (SWEREF99 TM) and tagging.

---

## Document Vault

Migration: `011_document_vault.sql`

### vault_documents

Secure document storage: contracts, certificates, insurance, maps, permits, invoices. File metadata, tagging, expiry tracking. RLS: own documents + org-level sharing.

---

## Quote Requests

Migration: `012_quote_requests.sql`

### quote_requests

Forest owners request quotes from providers. Supports multi-provider open requests, targeted requests, and response tracking. Service types: drone_survey, harvesting, planting, thinning, inspection, valuation, beetle_treatment, consulting, etc.

---

## Sensor & Fusion Products

Migration: `014_sensor_products.sql`

### sensor_products

Derived raster/file products from sensor processing. Unique on `(survey_id, sensor_type, product_name)`.

### fusion_products

Multi-sensor fusion outputs (beetle_stress, crown_health, moisture_stress, tree_inventory). Unique on `(survey_id, product_name)`.

---

## Pilot Job Lifecycle

Migration: `015_pilot_jobs.sql`

### pilot_jobs

Job board for drone pilot missions. Status lifecycle: open -> applied -> assigned -> in_progress -> completed. Fee calculation function: base 500 SEK + 200 SEK/ha + module surcharges.

### pilot_applications

Pilot bids on jobs. Unique on `(job_id, pilot_id)`.

---

## DJI Integration

Migration: `016_dji_integration.sql`

### dji_aircraft

Aircraft registry with DJI Cloud API pairing. Tracks capabilities (RTK, thermal, multispectral, LiDAR), firmware, flight hours.

### dji_missions

Waypoint mission definitions linked to surveys and parcels.

---

## Airspace Compliance

Migration: `017_airspace.sql`

### airspace_zones

Cached Swedish airspace zones from LFV, Dronarkollen, Naturvardsverket. Zone types: CTR, ATZ, R, P, D, NATURE_RESERVE, NOTAM, TRA, TSA. Geometry in WGS84 with GIST spatial index.

---

## Billing & Subscriptions

Migration: `018_billing.sql`

### subscriptions

Stripe integration. Plans: gratis, pro, enterprise. Billing cycles: monthly, yearly.

### usage_stats

Per-user usage tracking: parcels_used, api_calls, storage_mb, surveys_this_month, drone_minutes_used.

### invoices

Invoice records linked to Stripe. Amount in ore (1/100 SEK).

---

## NEW: Feedback

**Migration**: `019_feedback.sql` (to be created)

User-submitted feedback from the in-app feedback widget.

| Column        | Type        | Nullable | Default   | Notes |
|---------------|-------------|----------|-----------|-------|
| id            | uuid        | NO       | gen_random_uuid() | PK |
| user_id       | uuid        | NO       |           | FK -> profiles(id) ON DELETE CASCADE |
| rating        | integer     | YES      |           | 1-5 star rating |
| category      | text        | NO       | 'other'   | CHECK: bug, feature_request, praise, other |
| message       | text        | YES      |           | Free-text feedback |
| screen_path   | text        | YES      |           | Route where feedback was submitted (e.g., '/parcels/abc') |
| user_agent    | text        | YES      |           | Browser/device info |
| screenshot_path| text       | YES      |           | Optional screenshot in storage |
| status        | text        | NO       | 'new'     | CHECK: new, triaged, in_progress, resolved, wont_fix |
| admin_notes   | text        | YES      |           | Internal notes from admin |
| resolved_at   | timestamptz | YES      |           |       |
| resolved_by   | uuid        | YES      |           | FK -> profiles(id) |
| created_at    | timestamptz | NO       | now()     |       |
| updated_at    | timestamptz | NO       | now()     | Trigger: handle_updated_at |

**Indexes**:
- `idx_feedback_user_id(user_id)`
- `idx_feedback_status(status)`
- `idx_feedback_category(category)`
- `idx_feedback_created_at(created_at DESC)`

**RLS**: enabled.
**RLS Policies**:
- `feedback_insert_own`: authenticated users can insert (user_id = auth.uid()).
- `feedback_select_own`: users can read their own feedback.
- `feedback_select_admin`: admin role users can read all feedback.
- `feedback_update_admin`: admin role users can update (triage, resolve).

---

## NEW: Error Logs

**Migration**: `020_error_logs.sql` (to be created)

Client-side and server-side error tracking for debugging and monitoring.

| Column          | Type        | Nullable | Default   | Notes |
|-----------------|-------------|----------|-----------|-------|
| id              | uuid        | NO       | gen_random_uuid() | PK |
| error_code      | text        | NO       |           | Structured: E-{DOMAIN}-{ACTION}-{STATUS} |
| message         | text        | NO       |           | Human-readable error message |
| stack_trace     | text        | YES      |           | Stack trace (client or server) |
| user_id         | uuid        | YES      |           | FK -> profiles(id) ON DELETE SET NULL |
| session_id      | text        | YES      |           | Browser session or request ID |
| screen_path     | text        | YES      |           | Route where error occurred |
| component       | text        | YES      |           | React component or API endpoint name |
| severity        | text        | NO       | 'error'   | CHECK: warning, error, critical |
| source          | text        | NO       | 'client'  | CHECK: client, edge_function, worker, inference |
| user_agent      | text        | YES      |           |       |
| request_payload | jsonb       | YES      |           | Sanitized request data (no PII) |
| metadata        | jsonb       | YES      | '{}'      | Additional context |
| resolved        | boolean     | NO       | false     |       |
| resolved_at     | timestamptz | YES      |           |       |
| created_at      | timestamptz | NO       | now()     |       |

**Indexes**:
- `idx_error_logs_error_code(error_code)`
- `idx_error_logs_severity(severity)`
- `idx_error_logs_source(source)`
- `idx_error_logs_created_at(created_at DESC)`
- `idx_error_logs_user_id(user_id) WHERE user_id IS NOT NULL`
- `idx_error_logs_unresolved(resolved) WHERE resolved = false`

**RLS**: enabled.
**RLS Policies**:
- `error_logs_insert_authenticated`: any authenticated user can insert (client-side errors).
- `error_logs_insert_service`: service role can insert (server-side errors).
- `error_logs_select_admin`: admin role can read all.
- `error_logs_select_own`: users can read their own errors.

**Retention**: consider pg_cron job to purge rows older than 90 days.

---

## NEW: Admin Audit Log

**Migration**: `021_admin_audit_log.sql` (to be created)

Immutable log of all admin actions for compliance and accountability.

| Column       | Type        | Nullable | Default | Notes |
|--------------|-------------|----------|---------|-------|
| id           | uuid        | NO       | gen_random_uuid() | PK |
| admin_id     | uuid        | NO       |         | FK -> profiles(id) |
| action       | text        | NO       |         | e.g., 'user.ban', 'user.role_change', 'pilot.approve', 'feedback.resolve', 'community.hide_post', 'system.config_change' |
| target_type  | text        | NO       |         | e.g., 'user', 'pilot', 'post', 'feedback', 'system' |
| target_id    | uuid        | YES      |         | ID of the affected record |
| before_state | jsonb       | YES      |         | Snapshot of record before change |
| after_state  | jsonb       | YES      |         | Snapshot of record after change |
| reason       | text        | YES      |         | Admin's reason for the action |
| ip_address   | inet        | YES      |         | IP from request headers |
| user_agent   | text        | YES      |         |       |
| created_at   | timestamptz | NO       | now()   |       |

**Indexes**:
- `idx_audit_log_admin_id(admin_id)`
- `idx_audit_log_action(action)`
- `idx_audit_log_target(target_type, target_id)`
- `idx_audit_log_created_at(created_at DESC)`

**RLS**: enabled.
**RLS Policies**:
- `audit_log_insert_admin`: only admin role can insert.
- `audit_log_select_admin`: only admin role can read.
- No UPDATE or DELETE policies. This table is append-only.

**Important**: no DELETE policy is intentional. Audit logs must never be deleted by application code. Only a DBA with direct database access should purge old records.

---

## Relationships Diagram

```
auth.users
  |
  ├── profiles (1:1)
  |     ├── pilot_profiles (1:1, pilots only)
  |     ├── user_preferences (1:1)
  |     ├── subscriptions (1:1)
  |     ├── usage_stats (1:1)
  |     ├── companion_sessions (1:N)
  |     |     └── companion_messages (1:N)
  |     ├── knowledge_notes (1:N)
  |     ├── vault_documents (1:N)
  |     ├── user_data_embeddings (1:N)
  |     ├── feedback (1:N)                    [NEW]
  |     └── admin_audit_log (1:N, admin)      [NEW]
  |
  └── organizations (N:1)
        ├── parcels (1:N)
        |     ├── parcel_open_data (1:N)
        |     ├── parcel_access (1:N)
        |     ├── parcel_shares (1:N)
        |     ├── surveys (1:N)
        |     |     ├── survey_uploads (1:N)
        |     |     ├── analysis_results (1:N)
        |     |     ├── fusion_results (1:N)
        |     |     ├── processing_jobs (1:N)
        |     |     ├── sensor_products (1:N)
        |     |     ├── fusion_products (1:N)
        |     |     ├── reports (1:N)
        |     |     |     └── shared_reports (1:N)
        |     |     ├── dji_missions (1:N)
        |     |     └── pilot_jobs (1:1)
        |     ├── satellite_observations (1:N)
        |     ├── forest_archive_events (1:N)
        |     ├── family_stewards (1:N)
        |     ├── felling_permits (1:N)
        |     |     └── permit_documents (1:N)
        |     └── quote_requests (1:N)
        ├── dji_aircraft (1:N)
        └── marketplace_listings (1:N)
              ├── marketplace_bookings (1:N)
              └── marketplace_reviews (1:N)

Standalone tables:
  ├── research_embeddings (global KB)
  ├── regulatory_embeddings (global KB)
  ├── airspace_zones (cached external data)
  ├── web_search_results (cached search)
  ├── curated_news (cached news feed)
  ├── community_posts -> community_comments, community_likes
  └── error_logs (1:N from profiles, optional)  [NEW]
```

---

## Seed Data Strategy

Defined in `supabase/seed.sql`.

### Demo Organizations

| ID (deterministic UUID) | Name                    | Type            | Plan          |
|-------------------------|-------------------------|-----------------|---------------|
| `a1000000-...001`       | Varnamo Skogsbruk AB    | forest_owner    | professional  |
| `a2000000-...002`       | SydSkog Inspektioner    | inspection_firm | enterprise    |

### Demo Users

| ID (deterministic UUID) | Email                           | Role      | Organization |
|-------------------------|---------------------------------|-----------|--------------|
| `b1000000-...001`       | erik.lindgren@varnamo-skog.se   | owner     | Varnamo Skogsbruk |
| `b2000000-...002`       | anna.dronare@varnamo-skog.se    | pilot     | Varnamo Skogsbruk |
| `b3000000-...003`       | karl.inspektor@sydskog.se       | inspector | SydSkog |
| `b4000000-...004`       | maja.admin@sydskog.se           | admin     | SydSkog |

### Demo Parcels

Seed includes realistic Swedish forest parcels in Smaland region with actual SWEREF99 TM coordinates. Each parcel has:
- Realistic boundary polygons (3-5 vertices)
- Area 5-50 ha
- Municipality and county populated
- Fastighetsbeteckning format

### Demo Surveys

One complete survey per parcel with:
- All 6 analysis modules requested
- Sample analysis results with mock confidence scores
- One generated report per survey

### Seed Approach

1. **Local development**: run `supabase db seed` which executes `seed.sql` directly. Auth users are created via SQL in local Supabase.
2. **Hosted Supabase**: create auth users via Supabase Dashboard first (auth.users cannot be inserted via SQL on hosted). Then run seed for profiles, organizations, parcels, surveys, etc. with `ON CONFLICT DO NOTHING` for idempotency.
3. **Deterministic UUIDs**: all seed UUIDs follow the pattern `{entity_prefix}{sequence}-0000-0000-0000-00000000000{n}` for easy cross-referencing in tests and documentation.
4. **Knowledge base**: seed regulatory embeddings from a curated set of Skogsstyrelsen documents. Research embeddings from 10 key SLU publications. Run embedding generation pipeline after seed.
5. **Companion**: seed one companion session per demo user with 3-5 sample messages demonstrating different query types.
