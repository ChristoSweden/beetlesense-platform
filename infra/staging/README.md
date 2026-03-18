# BeetleSense — Staging Environment

Staging environment configuration for BeetleSense.ai infrastructure. Mirrors the production setup with lower resource limits and debug-level logging.

## Prerequisites

- Docker and Docker Compose v2+
- Node.js 20+ with pnpm
- Supabase CLI (`npx supabase`)
- A separate Supabase staging project (not the production project)
- `curl` (for health checks and data seeding)

## Quick Start

```bash
# 1. Create your .env.staging from the template
cp .env.staging.template .env.staging
# Edit .env.staging with your staging Supabase credentials and API keys

# 2. Link Supabase CLI to your staging project
cd ../../
npx supabase link --project-ref your-staging-project-ref

# 3. Deploy services
./deploy-staging.sh

# 4. Seed test data
./seed-staging.sh
```

## Files

| File | Description |
|---|---|
| `docker-compose.staging.yml` | Docker Compose overrides for staging (lower resources, debug logging, CPU-only inference) |
| `.env.staging.template` | Template with all required environment variables |
| `.env.staging` | Your actual staging secrets (git-ignored) |
| `deploy-staging.sh` | Full deployment: pull images, run migrations, deploy Edge Functions, health check |
| `seed-staging.sh` | Seed staging database with test users, parcels, surveys, and knowledge base |

## Architecture Differences from Production

| Aspect | Production | Staging |
|---|---|---|
| Redis memory | 1 GB | 256 MB |
| Worker memory | 2 GB / 2 CPUs | 1 GB / 1 CPU |
| Inference memory | 8 GB / 4 CPUs + GPU | 4 GB / 2 CPUs (CPU-only) |
| QGIS memory | 2 GB / 2 CPUs | 1 GB / 1 CPU |
| ONNX provider | CUDA | CPU |
| Log level | info/warning | debug |
| Node env | production | staging |

## Running Services

```bash
# Start staging (from this directory)
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up -d

# Include monitoring (Prometheus + Grafana + Loki)
docker compose \
  -f ../docker-compose.yml \
  -f docker-compose.staging.yml \
  -f ../monitoring/docker-compose.monitoring.yml \
  --env-file .env.staging \
  up -d

# View logs
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml logs -f worker
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml logs -f inference

# Stop all staging services
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml down
```

## Endpoints

| Service | URL |
|---|---|
| Worker Bull Board | http://localhost:3001 |
| Worker Health | http://localhost:3002/health |
| Inference API | http://localhost:8000 |
| Inference Docs | http://localhost:8000/docs |
| QGIS Server (WMS) | http://localhost:8080 |
| Prometheus | http://localhost:9090 (with monitoring stack) |
| Grafana | http://localhost:3000 (with monitoring stack) |

## Test Accounts

After running `seed-staging.sh`:

| Role | Email | Password |
|---|---|---|
| Owner | erik.lindgren@varnamo-skog.se | `staging-demo-2026!` |
| Pilot | anna.dronare@varnamo-skog.se | `staging-demo-2026!` |
| Inspector | karl.inspektor@sydskog.se | `staging-demo-2026!` |
| Admin | maja.admin@sydskog.se | `staging-demo-2026!` |

## Deployment Script Options

```bash
./deploy-staging.sh                    # Full deploy (migrations + Edge Functions + services)
./deploy-staging.sh --skip-migrations  # Skip database migrations
./deploy-staging.sh --rollback         # Rollback to previous container state
```

## Seed Script Options

```bash
./seed-staging.sh              # Full seed (knowledge base + SQL data + users)
./seed-staging.sh --kb-only    # Only seed knowledge base
./seed-staging.sh --data-only  # Only seed SQL data and users (skip knowledge base)
```

## Troubleshooting

**Services not starting:**
```bash
# Check container status
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml ps

# Check logs for a specific service
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml logs --tail=50 worker
```

**Redis connection issues:**
```bash
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml exec redis valkey-cli ping
```

**Inference model download slow:**
The first startup downloads ONNX models to a Docker volume (`model-cache`). This can take several minutes. Check progress with:
```bash
docker compose -f ../docker-compose.yml -f docker-compose.staging.yml logs -f inference
```
