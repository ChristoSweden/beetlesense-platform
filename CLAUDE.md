# CLAUDE.md — BeetleSense.ai

## Project Overview

BeetleSense.ai is an AI-powered forest intelligence platform for the Swedish forestry market. It detects bark beetle (granbarkborre / Ips typographus) infestations, monitors forest health, estimates timber volumes, and provides an AI companion for forestry advice. Three user roles: forest owners, drone pilots, and inspectors.

Monorepo managed with pnpm workspaces and Turborepo. Frontend is a React PWA served via Vite. Backend uses Supabase (Postgres + PostGIS, Auth, Storage, Deno Edge Functions). Background processing runs on Hetzner via BullMQ workers with Redis (Valkey). ML inference uses FastAPI + ONNX Runtime.

## Tech Stack

| Layer         | Technology                                           |
|---------------|------------------------------------------------------|
| Frontend      | React 19, Vite 6, TailwindCSS 4, MapLibre GL, Zustand, i18next |
| Backend       | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions/Deno) |
| Workers       | Node.js, BullMQ, Redis (Valkey), Express              |
| Inference     | Python, FastAPI, ONNX Runtime (GPU), PyTorch           |
| GIS           | QGIS Server (WMS/WFS), GDAL                           |
| Monitoring    | Prometheus, Grafana, Loki                              |
| CI/CD         | GitHub Actions, Docker, Turbo                          |

## Key Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start all apps in dev mode (Vite :5173 + workers)
pnpm build            # Build all packages and apps
pnpm lint             # Lint all packages
pnpm test             # Run all tests via Turbo
pnpm format           # Format all files with Prettier
pnpm format:check     # Check formatting without writing
pnpm clean            # Remove all dist/ and node_modules/
```

## How to Run Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Start Supabase (requires Docker + Supabase CLI)
npx supabase start

# 3. Start infrastructure (Redis, inference, QGIS)
cd infra && docker compose up -d && cd ..

# 4. Start all apps in dev mode
pnpm dev
# This runs the Vite dev server (port 5173) and worker watcher concurrently.

# 5. (Optional) Start monitoring stack
cd infra/monitoring && docker compose -f docker-compose.monitoring.yml up -d
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_KEY` (same as service role key, used by workers)
- `REDIS_URL` (default: `redis://localhost:6379`)
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`
- `INFERENCE_URL` (default: `http://localhost:8000`)
- External API keys: `SENTINEL_HUB_CLIENT_ID/SECRET`, `LANTMATERIET_API_KEY`, `SMHI_API_KEY`
- `GOOGLE_API_KEY` (Google Gemini text-embedding-004 for RAG retrieval)
- `ANTHROPIC_API_KEY` (Claude for AI Companion chat)

## Key Directories

```
beetlesense-platform/
├── apps/
│   ├── web/                  # React frontend (Vite + TailwindCSS)
│   │   ├── src/
│   │   │   ├── components/   # UI components by feature area
│   │   │   ├── pages/        # Route pages (owner/, pilot/, inspector/)
│   │   │   ├── stores/       # Zustand stores (authStore, mapStore)
│   │   │   ├── lib/          # Utilities (supabase client, offlineSync, push)
│   │   │   └── i18n/         # Swedish (sv) and English (en) translations
│   │   └── e2e/              # Playwright E2E tests
│   ├── workers/              # BullMQ job processors (Node.js)
│   │   └── src/
│   │       ├── processors/   # One processor per queue
│   │       ├── queues/       # Queue definitions
│   │       ├── services/     # Business logic (satellite, LiDAR, fusion, opendata)
│   │       ├── lib/          # Redis, Supabase, logger, storage clients
│   │       ├── health.ts     # Health/metrics HTTP server (port 3002)
│   │       └── openapi.ts    # OpenAPI spec generator
│   └── inference/            # Python FastAPI + ONNX models (not in this repo yet)
├── packages/
│   └── shared/               # Shared types, Zod schemas, constants
├── supabase/
│   ├── functions/            # Deno Edge Functions
│   │   ├── companion-chat/   # AI companion (streaming)
│   │   ├── parcel-register/  # Parcel registration
│   │   ├── survey-status/    # Survey lifecycle
│   │   ├── upload-presign/   # Presigned upload URLs
│   │   ├── upload-complete/  # Post-upload trigger
│   │   └── _shared/          # Auth, CORS, response helpers
│   └── schema.sql            # Database migrations
├── infra/
│   ├── docker-compose.yml          # Dev/prod infrastructure
│   ├── docker-compose.prod.yml     # Production overrides
│   ├── monitoring/                 # Prometheus + Grafana + Loki
│   ├── staging/                    # Staging docker-compose + env template
│   └── loadtest/                   # k6 load test scripts
├── docs/                           # Architecture, PRD, sprint docs, security checklist
├── turbo.json                      # Turborepo pipeline config
└── pnpm-workspace.yaml
```

## Testing Commands

```bash
# Unit tests (web)
pnpm --filter @beetlesense/web test
pnpm --filter @beetlesense/web test -- --coverage

# Unit tests (workers)
pnpm --filter @beetlesense/workers test

# E2E tests (requires running dev server + Supabase)
cd apps/web && npx playwright test
cd apps/web && npx playwright test --project=chromium
cd apps/web && npx playwright test --ui    # interactive mode

# Load tests
cd infra/loadtest && k6 run k6-survey-flow.js

# All tests via Turbo
pnpm test
```

## Deployment Process

1. Push to `main` triggers GitHub Actions CI (lint, typecheck, test).
2. On CI pass, Docker images are built for `workers` and `inference`.
3. Supabase Edge Functions deploy via `supabase functions deploy`.
4. Frontend builds via `vite build` and deploys to Vercel/CDN.
5. Infrastructure changes are applied via `docker compose` on the target server.

## Common Development Tasks

**Add a new Edge Function:**
```bash
npx supabase functions new my-function
# Edit supabase/functions/my-function/index.ts
# Use _shared/auth.ts, _shared/response.ts for consistency
npx supabase functions serve my-function   # local dev
npx supabase functions deploy my-function  # deploy
```

**Add a new BullMQ queue/processor:**
1. Create queue definition in `apps/workers/src/queues/myQueue.queue.ts`
2. Create processor in `apps/workers/src/processors/myQueue.processor.ts`
3. Register in `apps/workers/src/queues/index.ts` and `apps/workers/src/index.ts`
4. Add queue to the health server registry in `health.ts`

**Run a single workspace:**
```bash
pnpm --filter @beetlesense/web dev
pnpm --filter @beetlesense/workers dev
pnpm --filter @beetlesense/shared build
```

**Run load tests:**
```bash
cd infra/loadtest && k6 run load-test.js -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=...
```

**Deploy staging infrastructure:**
```bash
cd infra/staging
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml up -d
```

## Important Conventions

- **Spatial data**: all coordinates stored in SWEREF99 TM (EPSG:3006) in the database. Convert to WGS84 (EPSG:4326) only at the API boundary for map display.
- **Design system**: dark green theme (`#030d05` background). All UI components use TailwindCSS with the project's custom color palette.
- **Internationalization**: all user-facing strings go through i18next. Primary: Swedish (`sv`). Secondary: English (`en`). Translation files: `apps/web/src/i18n/`.
- **Queue naming**: kebab-case (e.g., `survey-processing`, `upload-validation`).
- **Logging**: structured JSON via Pino in workers, console in Edge Functions.
- **Error handling**: all Edge Functions use the shared `_shared/response.ts` helpers for consistent error formats.
- **File paths in storage**: `surveys/{survey_id}/{uuid}_{filename}` pattern.
