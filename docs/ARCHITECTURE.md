# BeetleSense.ai — Technical Architecture v2.0

## System Overview

```
                                    CLIENTS
    ┌─────────────────────────────────────────────────────────┐
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │  Forest Owner │  │ Drone Pilot  │  │   Inspector  │  │
    │  │  PWA (React)  │  │  PWA Portal  │  │  PWA Portal  │  │
    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
    │         └──────────┬───────┘──────────────────┘          │
    └────────────────────┼─────────────────────────────────────┘
                         │ HTTPS / SSE
                         ▼
    ┌─────────────────────────────────────────────────────────┐
    │           Vercel (PWA static) + Cloudflare (DNS/WAF)    │
    └────────────────────┬────────────────────────────────────┘
                         │
    ┌────────────────────┼────────────────────────────────────┐
    │              SUPABASE (EU Region)                        │
    │   Auth · PostGIS + pgvector · Edge Functions · Realtime  │
    └────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼────────────────────┐
         ▼               ▼                    ▼
    ┌──────────┐  ┌──────────────┐  ┌──────────────────┐
    │ SUPABASE │  │ PROCESSING   │  │ AI/ML CLUSTER    │
    │ PostGIS  │  │ WORKERS      │  │ (Hetzner GPU)    │
    │ pgvector │  │ (Hetzner)    │  │                  │
    │ Storage  │  │              │  │ Mod 1: Tree Count│
    │ Realtime │  │ Ingestion    │  │ Mod 2: Species ID│
    │          │  │ Open Data    │  │ Mod 3: Animal    │
    │          │  │ Data Fusion  │  │ Mod 4: Beetle    │
    │          │  │ Report Gen   │  │ Mod 5: Boar      │
    │          │  │ QGIS Server  │  │ Mod 6: [NDA]     │
    │          │  │              │  │ AI Companion RAG  │
    └──────────┘  └──────────────┘  └──────────────────┘
                         │
    ┌────────────────────┼────────────────────────────────────┐
    │            EXTERNAL DATA SOURCES                        │
    │  Lantmäteriet · Skogsstyrelsen · SGU · SMHI · SLU      │
    │  Copernicus Sentinel-1/2 · NASA Landsat · MODIS         │
    │  EFI BBOA · Global Forest Watch · EFFIS                 │
    └─────────────────────────────────────────────────────────┘
```

---

## 1. Tech Stack

### Frontend (PWA)
| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 19 + Vite 6 | Proven PWA support; matches existing codebase |
| Styling | Tailwind CSS v4 | Fast prototyping; utility-first |
| Routing | React Router v7 | Lazy loading; code splitting |
| State | Zustand | Lightweight; good for offline-first sync |
| Maps | MapLibre GL JS | Open-source; GeoJSON + rasters + vector tiles |
| Camera | Native MediaDevices API | Smartphone photo capture; no SDK needed |
| Offline | Workbox (vite-plugin-pwa) | Service worker; precaching; background sync |
| Charts | Recharts | NDVI time-series; health trends |
| Auth | @supabase/supabase-js | Direct integration |
| i18n | i18next | Swedish + English day one |
| Testing | Vitest + Playwright | Unit + E2E |

### Backend
| Concern | Choice | Rationale |
|---|---|---|
| Auth + DB + Realtime | Supabase (EU region) | PostGIS + pgvector + RLS + Realtime + Edge Functions |
| API Layer | Supabase Edge Functions (Deno) + Node.js workers (Hetzner) | Edge for auth-gated CRUD; workers for heavy processing |
| Job Queue | BullMQ + Redis (Valkey) | Priority queues; parent-child jobs; retry; progress |
| Geospatial | QGIS Server (Docker) on Hetzner | WMS/WFS; spatial analysis; cartographic output |
| Object Storage | Hetzner S3-compatible (~5 EUR/TB/month) | Drone imagery; orthomos; rasters; reports |
| Report Gen | Puppeteer (HTML→PDF) | Flexible layout; maps + charts + images |
| Push Notifications | Web Push API + VAPID | Standards-based; works in PWA |

### AI/ML
| Concern | Choice | Rationale |
|---|---|---|
| Inference Runtime | ONNX Runtime / TorchServe on Hetzner GPU | EU residency; fraction of cloud GPU cost |
| Mod 1 (Tree Count) | YOLO v8/v9 + LiDAR CHM prior | Proven object detection; fast inference |
| Mod 2 (Species ID) | ResNet-50 + temporal attention (Sentinel-2 phenology) | Multi-temporal critical for spruce/pine |
| Mod 3 (Animal) | YOLO v8 thermal/RGB | Transfer learning from wildlife datasets |
| Mod 4 (Beetle) | Ensemble: spectral anomaly CNN + e-nose 1D-CNN, fused | Dual-modality = core differentiator |
| Mod 5 (Boar) | DeepLabv3+ semantic segmentation | Soil disturbance patch classification |
| AI Companion | Claude API (RAG) + pgvector | <5s latency; 3 knowledge layer retrieval |
| Embeddings | text-embedding-3-small or Cohere Embed v3 | Good multilingual (Swedish) performance |
| ML Pipeline | DVC + MLflow on Hetzner | EU training; reproducible experiments |

---

## 2. Database Architecture

### PostgreSQL (Supabase) — PostGIS + pgvector

```sql
-- Core Domain
profiles          (id, role, full_name, email, region, language, org_id)
organizations     (id, name, type, billing_plan)
parcels           (id, owner_id, fastighets_id, name, boundary GEOMETRY, area_ha, centroid)

-- Open Data (cached per parcel)
parcel_open_data  (id, parcel_id, source, fetched_at, data_version, storage_path, metadata JSONB)

-- Survey Pipeline
surveys           (id, parcel_id, requested_by, pilot_id, status, modules[], priority, sla_deadline)
survey_uploads    (id, survey_id, upload_type, storage_path, geo_bounds GEOMETRY, status)
analysis_results  (id, survey_id, module, status, confidence_score, result_summary JSONB, result_geojson GEOMETRY, result_raster_path)
fusion_results    (id, survey_id, fusion_type, input_modules[], output_summary JSONB, output_geojson GEOMETRY)

-- Reports
reports           (id, survey_id, report_type, template_id, storage_path, generated_at)

-- AI Companion
companion_sessions  (id, user_id, parcel_id, created_at)
companion_messages  (id, session_id, role, content, sources JSONB, created_at)

-- Pilot Network
pilot_profiles    (id, registration_no, certification, coverage_area GEOMETRY, sensor_payloads[], verified)

-- Satellite Monitoring
satellite_observations (id, parcel_id, source, observation_date, cloud_cover_pct, ndvi_mean/min/max, band_data_path)

-- RAG Vector Store (pgvector)
research_embeddings     (id, paper_id, chunk_index, content, embedding VECTOR(1536), metadata JSONB)
regulatory_embeddings   (id, source, chunk_index, content, embedding VECTOR(1536), metadata JSONB)
user_data_embeddings    (id, user_id, source_type, source_id, content, embedding VECTOR(1536), metadata JSONB)
```

### Object Storage (Hetzner S3)
```
beetlesense-uploads/
  surveys/{survey_id}/raw/{upload_type}/{filename}
  surveys/{survey_id}/processed/{module}/{output_files}
  reports/{report_id}/{filename}.pdf

beetlesense-opendata/
  lidar/{tile_id}/
  sentinel2/{parcel_id}/{date}/
  knn/{tile_id}/

beetlesense-models/
  {module}/{version}/model.onnx
```

---

## 3. API Design

### Supabase Edge Functions (public)
```
POST /functions/v1/parcels/register         — Accepts fastighets_id, triggers open data pipeline
POST /functions/v1/surveys/create           — Validates modules, creates survey, matches pilot
POST /functions/v1/uploads/presign          — Returns presigned S3 upload URL
POST /functions/v1/uploads/complete         — Marks upload ready, triggers processing
GET  /functions/v1/surveys/{id}/status      — Processing status (also via Realtime)
POST /functions/v1/companion/chat           — Streaming SSE response with RAG
GET  /functions/v1/companion/sessions       — Conversation history
POST /functions/v1/reports/generate         — Triggers PDF generation
GET  /functions/v1/satellite/{parcel_id}/timeseries — NDVI time-series
POST /functions/v1/pilot/accept-mission     — Pilot accepts survey mission
GET  /functions/v1/opendata/{parcel_id}/layers — Available open data layers
POST /functions/v1/alerts/subscribe         — Push notification + alert thresholds
```

### Internal Worker API (Hetzner, not public)
```
POST /internal/process/survey               — BullMQ job: orchestrate module pipeline
POST /internal/inference/{module}            — Run specific AI module
POST /internal/fusion/run                   — Data fusion across module outputs
POST /internal/opendata/fetch/{source}      — Fetch + cache open data for parcel
POST /internal/satellite/fetch              — Download + process satellite scenes
POST /internal/report/render                — Render PDF from template + data
```

### Auth
- Supabase Auth with magic link (email) for owners, password + 2FA for pilots/inspectors
- JWT Bearer tokens; RLS enforces data isolation
- Parcel access grants via `parcel_access` junction table for inspector sharing

---

## 4. AI/ML Processing Pipeline

```
Upload Complete
     │
     ▼
Validation Worker ─→ Pre-process Worker ─→ Module Dispatcher (BullMQ)
                                                │
                    ┌──────┬──────┬──────┬──────┬──────┐
                    ▼      ▼      ▼      ▼      ▼      ▼
                  Mod1   Mod2   Mod3   Mod4   Mod5   Mod6
                  (parallel execution on GPU cluster)
                    │      │      │      │      │      │
                    └──────┴──────┴──────┴──────┴──────┘
                                   │
                                   ▼
                          Data Fusion Engine
                    (spatial align + confidence weight + open data enrich)
                                   │
                                   ▼
                          Post-Process (GeoJSON + raster tiles + pgvector embed)
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                    Report Gen        Notify (push + email + Realtime WS)
```

### AI Companion RAG Pipeline
```
User Query → Intent Classify → Query Embedding
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        Layer 1: Research     Layer 2: Regulatory   Layer 3: User Data
        (pgvector top-5)      (pgvector top-3)      (pgvector top-5, RLS)
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                          Context Assembly (~12k tokens)
                                    ▼
                          LLM Generation (Claude API, streaming SSE)
                          System prompt: forest scientist persona
                          + source citation + confidence disclosure
```

---

## 5. Infrastructure & Deployment

### Production
- **Vercel**: PWA static hosting (CDN edge, preview deploys)
- **Cloudflare**: DNS, DDoS/WAF
- **Supabase (EU managed)**: PostgreSQL + PostGIS + pgvector, Auth, Edge Functions, Realtime, Storage
- **Hetzner (Helsinki/Falkenstein)**:
  - Docker Swarm / k3s cluster (3× CPX41 worker nodes)
  - GPU dedicated server (RTX 4000 SFF Ada) for inference
  - Redis (Valkey) + BullMQ for job orchestration
  - QGIS Server (Docker)
  - Hetzner Object Storage (S3-compatible)

### CI/CD
```
GitHub monorepo:
  /apps/web           → React PWA (Vercel auto-deploy)
  /apps/workers       → Node.js processing workers (Docker → Hetzner)
  /apps/inference     → Python ML inference server (Docker → Hetzner GPU)
  /packages/shared    → TypeScript types, utils
  /supabase           → Migrations, edge functions, seed data
  /ml                 → Training scripts, DVC pipelines
  /infra              → Docker Compose, k3s manifests

GitHub Actions:
  PR → lint + typecheck + unit tests + migration dry-run
  main → Vercel deploy + Docker build/push + Hetzner deploy + Supabase push
```

### Monitoring
- **Errors**: Sentry
- **Infra**: Grafana + Prometheus + Loki (Hetzner VPS)
- **Uptime**: UptimeRobot (99.5% SLA)
- **ML**: MLflow experiment tracking
- **SLA Alerts**: Grafana Alerting → PagerDuty

### Cost Estimate (Launch Scale)
| Item | Monthly |
|---|---|
| Hetzner VPS cluster (3× CPX41 + 1× CPX31) | ~120 EUR |
| Hetzner GPU dedicated server | ~150–250 EUR |
| Hetzner Object Storage (5 TB) | ~25 EUR |
| Supabase Pro | ~25 USD |
| Vercel Pro | ~20 USD |
| Cloudflare Pro | ~20 USD |
| LLM API (Claude) | ~200–500 USD |
| Embedding API | ~50 USD |
| **Total** | **~650–1,000 EUR/month** |

---

## 6. Key Architectural Decisions

### D1: Supabase as core platform
Supabase for auth, DB, realtime, edge functions. Custom workers only for heavy processing. Eliminates months of backend plumbing. Open-source and self-hostable if needed later.

### D2: Hetzner for compute (not AWS/GCP)
EU data residency (GDPR). 3–5× cheaper than AWS eu-north-1. Trade-off: manage your own Docker deployments. Acceptable for a small team.

### D3: Single PWA, role-based routing
One React codebase for owner/pilot/inspector. Shared components (maps, AI Companion). Code-split by role via React.lazy.

### D4: pgvector in Supabase PG (not separate vector DB)
~50k–200k vectors at launch. pgvector with HNSW handles this with <100ms queries. RLS isolates user embeddings. Migrate to dedicated vector DB only if/when needed.

### D5: BullMQ for job orchestration
Priority queues (Enterprise 4h vs Standard 24h). Parent-child jobs (survey → modules → fusion → report). Redis persistence + Hetzner snapshots.

### D6: Modules run in parallel, fusion after all complete
Modules are independent. Parallel execution minimizes processing time. BullMQ parent-child pattern triggers fusion on all-children-complete.

### D7: Eager open data fetch on parcel registration
Pre-cache all layers when user registers fastighets_id. First survey processes faster (LiDAR CHM already available). Defer large rasters until survey ordered.

### D8: Streaming SSE for AI Companion
Simpler than WebSocket for unidirectional streaming. Works through CDNs. Supabase Realtime handles bidirectional needs separately.

### D9: Monorepo with shared types
Single GitHub repo. Shared TypeScript types prevent frontend/backend drift. Single CI pipeline. Turborepo for incremental builds.

---

## 7. Security Architecture

- **Auth**: Supabase Auth (JWT) with magic link + password + 2FA
- **Authorization**: PostgreSQL RLS policies enforce data isolation per customer
- **Transport**: TLS 1.3 everywhere; Cloudflare WAF
- **At Rest**: AES-256 (Supabase managed encryption + Hetzner disk encryption)
- **Data Isolation**: Per-customer namespace for AI Companion Layer 3 data
- **GDPR**: EU data residency (Hetzner DE/FI + Supabase EU); no customer data used for shared model training without opt-in
- **API Security**: Rate limiting on Edge Functions; RBAC on internal APIs; presigned URLs for uploads (time-limited)
- **Audit**: All AI Companion interactions logged with sources; all data access logged
