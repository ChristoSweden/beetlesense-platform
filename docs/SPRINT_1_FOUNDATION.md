# Sprint 1: Foundation

**Duration:** 2 weeks (March 16 – March 29, 2026)
**Goal:** Establish the monorepo structure, database schema, authentication, infrastructure scaffolding, CI/CD pipeline, and PWA shell with a working map — so that all subsequent sprints build on a proven, deployable foundation.

---

## 1. Monorepo Setup

### 1.1 Initialize Turborepo with package structure
**Owner:** Infra / Full-stack | **Duration:** 1 day | **Dependencies:** None (Day 1 blocker)

**Tasks:**
- `pnpm init` at root, configure `pnpm-workspace.yaml` with packages: `apps/*`, `packages/*`, `supabase`
- Install Turborepo, configure `turbo.json` with pipelines: `build`, `dev`, `lint`, `typecheck`, `test`
- Scaffold directory tree:
  ```
  /apps/web          — React PWA (Vite 6)
  /apps/workers      — Node.js + BullMQ job runners
  /apps/inference    — Python ML service (FastAPI)
  /packages/shared   — TypeScript types, constants, validation schemas
  /supabase          — migrations, seed, edge functions
  /infra             — Docker Compose, scripts
  ```
- Configure root `tsconfig.base.json` with path aliases
- Add `.nvmrc` (Node 22 LTS), `.python-version` (3.12), `.editorconfig`, `.prettierrc`, `.eslintrc.cjs`

**Acceptance Criteria:**
- [ ] `pnpm install` succeeds with zero warnings
- [ ] `pnpm turbo run build` builds in correct dependency order
- [ ] `packages/shared` types importable from both `apps/web` and `apps/workers`
- [ ] `apps/inference` has working `pyproject.toml` with lock file

### 1.2 Shared types package
**Owner:** Full-stack | **Duration:** 0.5 days | **Dependencies:** 1.1

**Tasks:**
- Define types in `packages/shared/src/types/`:
  - `auth.ts` — `UserRole` enum, `SessionUser`
  - `database.ts` — Row types for all core tables
  - `geo.ts` — `BBox`, `LngLat`, `GeoJSONFeature<ParcelProperties>`
  - `api.ts` — `ApiResponse<T>`, `PaginatedResponse<T>`, error codes
- Add Zod schemas for runtime validation
- Build with `tsup` (dual CJS/ESM)

**Acceptance Criteria:**
- [ ] `import { UserRole, ParcelRow } from '@beetlesense/shared'` works in both apps
- [ ] Zod schemas validate sample data (unit tests pass)
- [ ] Changing a shared type causes downstream typecheck failure

---

## 2. Supabase Project + Database Schema

### 2.1 Supabase project provisioning
**Owner:** Backend / Infra | **Duration:** 0.5 days | **Dependencies:** 1.1

- Create Supabase project (EU region)
- Configure `supabase/config.toml` for local dev
- Enable PostGIS and pgvector extensions
- Set up `supabase link` for staging

**Acceptance Criteria:**
- [ ] `supabase start` launches local stack
- [ ] PostGIS and pgvector queries succeed
- [ ] `.env.example` documents all required keys

### 2.2 Core database schema (migration 001)
**Owner:** Backend | **Duration:** 1.5 days | **Dependencies:** 2.1

```sql
organizations   (id, name, slug, org_type, settings, created_at, updated_at)
profiles        (id → auth.users, organization_id, role, full_name, phone, avatar_url, onboarded)
parcels         (id, organization_id, name, external_ref, geometry GEOMETRY(MultiPolygon,3006), area_ha GENERATED, metadata)
surveys         (id, parcel_id, organization_id, surveyed_by, survey_type, status, surveyed_at, notes, metadata)
survey_uploads  (id, survey_id, organization_id, file_name, file_type, storage_path, file_size_bytes, processing_status, metadata)
```

- Spatial index on `parcels.geometry` (GIST)
- Indexes on `organization_id` FKs and `surveys.status`
- `updated_at` trigger function
- Seed: demo org, 2 users, 2 parcels (Småland coordinates), 1 survey

**Acceptance Criteria:**
- [ ] `supabase db reset` applies migration + seed without errors
- [ ] `ST_AsGeoJSON(geometry)` returns valid GeoJSON for seeded parcels
- [ ] FK constraints enforce referential integrity
- [ ] Shared types match schema column-for-column

---

## 3. Authentication

### 3.1 Supabase Auth configuration
**Owner:** Backend | **Duration:** 1 day | **Dependencies:** 2.2

- Enable Magic Link (forest owners) and Email/Password (pilots/inspectors)
- Configure TOTP MFA for pilot and inspector roles
- Auth hook: auto-create `profiles` row on signup with `role` and `organization_id`
- Email templates with BeetleSense branding
- JWT expiry: 1h, refresh: 7 days

**Acceptance Criteria:**
- [ ] Magic link signup creates both `auth.users` and `profiles`
- [ ] Pilot signup triggers MFA enrollment
- [ ] JWT contains `role` and `organization_id` claims
- [ ] Expired tokens return 401

### 3.2 Frontend auth integration
**Owner:** Frontend | **Duration:** 1.5 days | **Dependencies:** 1.1, 3.1

- Zustand auth store: `session`, `user`, `profile`, `isLoading`, `error`
- Auth pages: `/login`, `/signup`, `/auth/callback`, `/mfa/setup`, `/mfa/verify`
- `<ProtectedRoute>` component with role checks
- Auto-refresh via `onAuthStateChange`

**Acceptance Criteria:**
- [ ] Owner signs up/in via magic link only
- [ ] Pilot redirected to MFA setup before dashboard access
- [ ] Unauthenticated users redirect to `/login`
- [ ] Role-based routes reject unauthorized roles

---

## 4. Row-Level Security

### 4.1 RLS policies (migration 002)
**Owner:** Backend | **Duration:** 1 day | **Dependencies:** 2.2, 3.1

- Enable RLS on all core tables
- Helper function `auth.organization_id()` from JWT
- Policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| organizations | Members | Admin | Admin | Superadmin |
| profiles | Own + same-org | Auth hook | Own only | Superadmin |
| parcels | Same org | Owner/Admin | Owner/Admin | Admin |
| surveys | Same org | Pilot/Inspector/Admin | Assigned/Admin | Admin |
| survey_uploads | Same org | Pilot/Inspector | Uploader/Admin | Admin |

**Acceptance Criteria:**
- [ ] User in Org A cannot see Org B data
- [ ] Owner can create parcels but not surveys
- [ ] No table has RLS disabled

---

## 5. Hetzner Infrastructure

### 5.1 Docker Compose development stack
**Owner:** Infra | **Duration:** 1 day | **Dependencies:** 1.1

Services: `redis` (Valkey 8), `worker` (Node.js 22), `inference` (Python 3.12 FastAPI), `qgis-server` (3.36)

**Acceptance Criteria:**
- [ ] `docker compose up` starts all services with health checks passing
- [ ] Worker logs "BullMQ ready"
- [ ] Inference responds to `GET /health`
- [ ] QGIS Server responds to `GetCapabilities`

### 5.2 BullMQ worker scaffold
**Owner:** Backend | **Duration:** 1 day | **Dependencies:** 5.1, 1.2

- Queues: `upload-processing`, `tile-generation`, `inference-request`
- Echo processor (placeholder)
- Bull Board dashboard on port 3001
- Graceful shutdown, structured logging (pino)

**Acceptance Criteria:**
- [ ] Job added to queue is processed within 2s
- [ ] Bull Board shows queue stats at localhost:3001
- [ ] SIGTERM causes graceful drain

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions workflows
**Owner:** Infra | **Duration:** 1 day | **Dependencies:** 1.1, 5.1

- `ci.yml`: lint → typecheck → test → build (on PR + push to main)
- `deploy-preview.yml`: PR labeled `preview` → Vercel preview URL
- `deploy-production.yml`: push to main → Vercel + Supabase push + Hetzner SSH deploy

**Acceptance Criteria:**
- [ ] Type error in PR fails CI with inline annotation
- [ ] Preview deploy creates working URL
- [ ] Production deploy gated behind CI success
- [ ] Total CI < 3 minutes

---

## 7. PWA Shell

### 7.1 Vite + React + Tailwind scaffold
**Owner:** Frontend | **Duration:** 1 day | **Dependencies:** 1.1, 1.2

- Vite 6, React 19, TypeScript, Tailwind CSS 4
- Design tokens: `forest-900..50`, `bark`, `canopy`, `alert-red`, `beetle-amber`
- React Router 7 routes: `/owner/*`, `/pilot/*`, `/inspector/*`, `/admin/*`
- Layout: `<AppShell>`, `<Sidebar>`, `<TopBar>`, `<MobileNav>`
- Placeholder pages for all routes

**Acceptance Criteria:**
- [ ] Dev server starts < 500ms
- [ ] Auth redirects work
- [ ] Role-based routing blocks unauthorized access
- [ ] Responsive: sidebar → bottom nav on mobile

### 7.2 PWA / Workbox configuration
**Owner:** Frontend | **Duration:** 0.5 days | **Dependencies:** 7.1

- `vite-plugin-pwa`: manifest, Workbox GenerateSW
- Cache strategies: CacheFirst (shell), NetworkFirst (API), CacheFirst+LRU (map tiles)
- Install prompt, offline fallback page

**Acceptance Criteria:**
- [ ] Lighthouse PWA score 100
- [ ] Installs to home screen on Android + iOS
- [ ] App shell loads fully offline

---

## 8. Map Component

### 8.1 MapLibre GL with Swedish ortofoto
**Owner:** Frontend | **Duration:** 1.5 days | **Dependencies:** 7.1

- `maplibre-gl` + `react-map-gl`
- Default center: Småland (57.2, 15.0)
- Base layer: Lantmäteriet ortofoto WMS
- Layer toggle: ortofoto / topowebb / OSM
- `<ParcelLayer>`: GeoJSON from Supabase, click → popup
- Zustand map store: center, zoom, selectedParcelId, visibleLayers

**Acceptance Criteria:**
- [ ] Swedish ortofoto tiles render without CORS errors
- [ ] Seeded parcels appear as green polygons
- [ ] Click parcel → popup with name, area, last survey
- [ ] 60fps pan/zoom with 100 parcels

---

## Dependency Graph

```
1.1 Monorepo Setup
 ├── 1.2 Shared Types
 │    └── 5.2 Worker Scaffold
 ├── 2.1 Supabase Provisioning
 │    └── 2.2 Database Schema
 │         ├── 3.1 Auth Config → 3.2 Frontend Auth
 │         ├── 4.1 RLS Policies
 │         └── 8.1 Map Component
 ├── 5.1 Docker Compose → 5.2 Worker Scaffold
 ├── 7.1 PWA Shell → 7.2 Workbox → 8.1 Map
 └── 6.1 CI/CD Pipeline
```

**Critical path:** 1.1 → 2.1 → 2.2 → 3.1 → 4.1 (8 days)
**Parallel track A:** 1.1 → 7.1 → 8.1 (4.5 days, frontend)
**Parallel track B:** 1.1 → 5.1 → 5.2 (3 days, infra)

---

## Team Allocation

| Person | Week 1 | Week 2 |
|---|---|---|
| **Infra** | 1.1 Monorepo → 5.1 Docker → 6.1 CI/CD | 6.1 finish → support |
| **Backend** | 2.1 Supabase → 2.2 Schema → 1.2 Types | 3.1 Auth → 4.1 RLS |
| **Frontend** | 7.1 PWA Shell → 7.2 Workbox | 3.2 Auth UI → 8.1 Map |
| **ML** | Python scaffold in apps/inference | Health endpoint + model stub |

---

## Sprint Exit Criteria

1. Clone → `pnpm install && supabase start && pnpm dev` → PWA with map showing seeded parcels
2. Forest owner signs up via magic link, sees own parcels, isolated from other orgs
3. Pilot signs up with password + MFA, accesses pilot-only routes
4. CI rejects lint/type errors, deploys main to preview URL
5. Docker Compose runs all backend services with health checks
6. Lighthouse PWA score 100; app installs and works offline (shell)
7. No public table has RLS disabled
