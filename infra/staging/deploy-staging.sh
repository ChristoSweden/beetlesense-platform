#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# BeetleSense — Staging Deployment Script
#
# Usage:
#   ./deploy-staging.sh              # Full deploy
#   ./deploy-staging.sh --skip-migrations  # Skip DB migrations
#   ./deploy-staging.sh --rollback   # Rollback to previous images
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"
ENV_FILE="$SCRIPT_DIR/.env.staging"
COMPOSE_BASE="$INFRA_DIR/docker-compose.yml"
COMPOSE_STAGING="$SCRIPT_DIR/docker-compose.staging.yml"

SKIP_MIGRATIONS=false
ROLLBACK=false
HEALTH_RETRIES=30
HEALTH_INTERVAL=5

# ---------- Parse arguments ----------
for arg in "$@"; do
  case $arg in
    --skip-migrations) SKIP_MIGRATIONS=true ;;
    --rollback)        ROLLBACK=true ;;
    --help|-h)
      echo "Usage: $0 [--skip-migrations] [--rollback]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ---------- Helpers ----------
log()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { log "ERROR: $*" >&2; }
die()   { error "$*"; exit 1; }

compose() {
  docker compose \
    -f "$COMPOSE_BASE" \
    -f "$COMPOSE_STAGING" \
    --env-file "$ENV_FILE" \
    "$@"
}

# ---------- Preflight checks ----------
log "=== BeetleSense Staging Deployment ==="

[ -f "$ENV_FILE" ] || die ".env.staging not found at $ENV_FILE — copy from .env.staging.template"

command -v docker >/dev/null 2>&1        || die "docker is not installed"
docker info >/dev/null 2>&1              || die "Docker daemon is not running"
command -v npx >/dev/null 2>&1           || die "npx is not available (install Node.js)"

# ---------- Rollback ----------
if [ "$ROLLBACK" = true ]; then
  log "Rolling back to previous images..."
  compose down --timeout 30
  compose up -d --no-build
  log "Rollback complete. Running health checks..."
  # Fall through to health check
fi

# ---------- Pull latest images ----------
if [ "$ROLLBACK" = false ]; then
  log "Pulling latest images..."
  compose pull || log "WARN: Some images failed to pull — using local cache"

  # ---------- Run database migrations ----------
  if [ "$SKIP_MIGRATIONS" = false ]; then
    log "Running Supabase migrations..."
    # Source env vars for Supabase CLI
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a

    SUPABASE_DB_URL="${STAGING_SUPABASE_URL:-}"
    if [ -z "$SUPABASE_DB_URL" ]; then
      die "STAGING_SUPABASE_URL not set in .env.staging"
    fi

    cd "$PROJECT_ROOT"
    npx supabase db push --linked || {
      error "Migration failed — aborting deployment"
      exit 1
    }
    log "Migrations applied successfully."
  else
    log "Skipping migrations (--skip-migrations)."
  fi

  # ---------- Deploy Edge Functions ----------
  log "Deploying Supabase Edge Functions..."
  cd "$PROJECT_ROOT"

  EDGE_FUNCTIONS=(
    companion-chat
    parcel-register
    parcel-share
    request-quote
    survey-status
    upload-complete
    upload-presign
    satellite-timeseries
    alerts-subscribe
    vision-identify
  )

  for fn in "${EDGE_FUNCTIONS[@]}"; do
    log "  Deploying function: $fn"
    npx supabase functions deploy "$fn" --no-verify-jwt 2>/dev/null || {
      error "Failed to deploy Edge Function: $fn"
      # Non-fatal — continue with remaining functions
    }
  done
  log "Edge Functions deployment complete."

  # ---------- Start / restart services ----------
  log "Starting staging services..."
  compose up -d --remove-orphans --force-recreate
fi

# ---------- Health check ----------
log "Waiting for services to become healthy..."

check_health() {
  local service="$1"
  local url="$2"
  local retries=$HEALTH_RETRIES

  while [ $retries -gt 0 ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "  $service is healthy"
      return 0
    fi
    retries=$((retries - 1))
    sleep "$HEALTH_INTERVAL"
  done

  error "  $service failed health check at $url"
  return 1
}

HEALTH_FAILED=false

check_health "Redis"     "http://localhost:6379" 2>/dev/null || true  # Redis has no HTTP endpoint
check_health "Worker"    "http://localhost:3002/health"       || HEALTH_FAILED=true
check_health "Inference" "http://localhost:8000/health"       || HEALTH_FAILED=true
check_health "QGIS"     "http://localhost:8080/ows?service=WMS&request=GetCapabilities" || HEALTH_FAILED=true

# Check Redis via docker exec instead
if compose exec -T redis valkey-cli ping 2>/dev/null | grep -q PONG; then
  log "  Redis is healthy"
else
  error "  Redis failed health check"
  HEALTH_FAILED=true
fi

if [ "$HEALTH_FAILED" = true ]; then
  error "One or more services failed health checks."
  log "Container status:"
  compose ps
  log ""
  log "Recent logs:"
  compose logs --tail=30 --no-color
  log ""
  error "Deployment may be incomplete. Consider running: $0 --rollback"
  exit 1
fi

# ---------- Summary ----------
log ""
log "=== Staging deployment successful ==="
log ""
log "Services:"
compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
log ""
log "Endpoints:"
log "  Worker Bull Board:  http://localhost:3001"
log "  Worker Health:      http://localhost:3002/health"
log "  Inference API:      http://localhost:8000"
log "  Inference Docs:     http://localhost:8000/docs"
log "  QGIS Server:        http://localhost:8080"
log ""
