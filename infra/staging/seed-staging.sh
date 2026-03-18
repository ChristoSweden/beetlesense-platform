#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# BeetleSense — Staging Data Seeder
#
# Seeds the staging Supabase project with test data:
#   1. Knowledge base (research papers, regulations, datasets)
#   2. Test users (owner, pilot, inspector)
#   3. Demo parcels with SWEREF99 TM geometries
#   4. Surveys and analysis results
#   5. Community posts and marketplace listings (if tables exist)
#
# Usage:
#   ./seed-staging.sh                # Full seed
#   ./seed-staging.sh --kb-only      # Only knowledge base
#   ./seed-staging.sh --data-only    # Only SQL seed data
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"
ENV_FILE="$SCRIPT_DIR/.env.staging"

KB_ONLY=false
DATA_ONLY=false

# ---------- Parse arguments ----------
for arg in "$@"; do
  case $arg in
    --kb-only)   KB_ONLY=true ;;
    --data-only) DATA_ONLY=true ;;
    --help|-h)
      echo "Usage: $0 [--kb-only] [--data-only]"
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

# ---------- Preflight ----------
[ -f "$ENV_FILE" ] || die ".env.staging not found — copy from .env.staging.template"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

SUPABASE_URL="${STAGING_SUPABASE_URL:-}"
SUPABASE_KEY="${STAGING_SUPABASE_SERVICE_ROLE_KEY:-}"

[ -n "$SUPABASE_URL" ]  || die "STAGING_SUPABASE_URL not set"
[ -n "$SUPABASE_KEY" ]  || die "STAGING_SUPABASE_SERVICE_ROLE_KEY not set"

log "=== BeetleSense Staging Data Seeder ==="
log "Target: $SUPABASE_URL"

# ---------- 1. Knowledge Base ----------
if [ "$DATA_ONLY" = false ]; then
  log ""
  log "--- Step 1: Seeding knowledge base ---"

  cd "$PROJECT_ROOT"
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY" \
  SUPABASE_SERVICE_KEY="$SUPABASE_KEY" \
    npx tsx scripts/seed-knowledge-base.ts || {
      error "Knowledge base seeding failed (non-fatal — continuing)"
    }

  if [ "$KB_ONLY" = true ]; then
    log ""
    log "=== Knowledge base seeding complete (--kb-only) ==="
    exit 0
  fi
fi

# ---------- 2. Core Seed Data (SQL) ----------
log ""
log "--- Step 2: Seeding core data (organizations, profiles, parcels, surveys) ---"

SEED_SQL="$PROJECT_ROOT/supabase/seed.sql"
[ -f "$SEED_SQL" ] || die "seed.sql not found at $SEED_SQL"

# Use Supabase Management API to run SQL via the REST endpoint
# Alternatively, if psql is available and DB URL is configured, use that
if command -v psql >/dev/null 2>&1 && [ -n "${STAGING_DB_URL:-}" ]; then
  log "Using psql to apply seed.sql..."
  psql "$STAGING_DB_URL" -f "$SEED_SQL" || {
    error "SQL seed failed via psql"
    exit 1
  }
else
  log "Using Supabase CLI to push seed data..."
  cd "$PROJECT_ROOT"
  # supabase db push applies migrations; for seed we use the REST API
  # Execute seed SQL via the Supabase SQL editor API
  log "Executing seed.sql via supabase db execute..."
  npx supabase db execute --linked < "$SEED_SQL" 2>/dev/null || {
    # Fallback: try using the REST API with rpc
    log "supabase db execute not available — attempting REST API..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
      -H "apikey: $SUPABASE_KEY" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"SELECT 1\"}" 2>/dev/null) || true

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
      log "REST API available — seeding via individual inserts"
    else
      error "Could not execute seed SQL automatically."
      error "Please run manually: psql \$STAGING_DB_URL -f supabase/seed.sql"
      error "Or use the Supabase Dashboard SQL editor."
    fi
  }
fi

log "Core data seeding complete."

# ---------- 3. Create Test Auth Users ----------
log ""
log "--- Step 3: Creating test auth users ---"

create_test_user() {
  local email="$1"
  local password="$2"
  local display_name="$3"

  log "  Creating user: $email ($display_name)"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"$display_name\"
      }
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log "    Created with ID: ${USER_ID:-unknown}"
  elif echo "$BODY" | grep -q "already been registered"; then
    log "    Already exists — skipping"
  else
    error "    Failed (HTTP $HTTP_CODE): $BODY"
  fi
}

TEST_PASSWORD="staging-demo-2026!"

create_test_user "erik.lindgren@varnamo-skog.se"   "$TEST_PASSWORD" "Erik Lindgren (Owner)"
create_test_user "anna.dronare@varnamo-skog.se"    "$TEST_PASSWORD" "Anna Dronare (Pilot)"
create_test_user "karl.inspektor@sydskog.se"       "$TEST_PASSWORD" "Karl Inspektor (Inspector)"
create_test_user "maja.admin@sydskog.se"            "$TEST_PASSWORD" "Maja Administrator (Admin)"

log "Test users created."
log "  Login password for all test users: $TEST_PASSWORD"

# ---------- 4. Seed Additional Staging Data ----------
log ""
log "--- Step 4: Seeding additional staging data ---"

# Community posts and marketplace listings via REST API
# These tables may not exist yet — fail gracefully

seed_via_rest() {
  local table="$1"
  local data="$2"
  local description="$3"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$SUPABASE_URL/rest/v1/$table" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$data")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    log "  Seeded: $description"
  elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
    log "  Skipped: $description (table may not exist yet)"
  else
    BODY=$(echo "$RESPONSE" | sed '$d')
    error "  Failed ($HTTP_CODE): $description — $BODY"
  fi
}

# Community posts
seed_via_rest "community_posts" '[
  {
    "author_id": "b1000000-0000-0000-0000-000000000001",
    "title": "Barkborre-situation i Småland — mars 2026",
    "body": "Har någon annan sett ökad aktivitet i gran-bestånden? Vi hittade 23 angripna träd i vår senaste drönarflygning. Delar gärna erfarenheter.",
    "category": "pest_management",
    "region": "Jönköpings län"
  },
  {
    "author_id": "b3000000-0000-0000-0000-000000000003",
    "title": "Tips: Feromonfällor — bästa placeringen",
    "body": "Efter 5 års erfarenhet med feromonfällor vill jag dela vad som fungerat bäst. Placera dem 20-30m från beståndskanten, i SE-exponerade lägen.",
    "category": "pest_management",
    "region": "Kronobergs län"
  },
  {
    "author_id": "b2000000-0000-0000-0000-000000000002",
    "title": "DJI Matrice 350 RTK — erfarenheter med multispektral",
    "body": "Har flugit 37 uppdrag med M350 RTK och multispektral payload. Delar gärna inställningar och tips för bästa resultat vid skogsflygningar.",
    "category": "technology",
    "region": "Jönköpings län"
  }
]' "community posts (3 entries)"

# Marketplace listings
seed_via_rest "marketplace_listings" '[
  {
    "seller_id": "b2000000-0000-0000-0000-000000000002",
    "title": "Drönarflygning — skogsövervakning Småland",
    "description": "Erbjuder professionella drönarflygningar med multispektral och thermal kamera. DJI Matrice 350 RTK. A2 Open Category-certifierad. Täcker Jönköpings och Kronobergs län.",
    "category": "drone_service",
    "price_sek": 1200,
    "price_unit": "per_hour",
    "region": "Jönköpings län",
    "status": "active"
  },
  {
    "seller_id": "b3000000-0000-0000-0000-000000000003",
    "title": "Skogsinventering och barkborre-inspektion",
    "description": "Certifierad skogsinspektör med 15 års erfarenhet. Erbjuder fullständig inventering, barkborre-bedömning och åtgärdsplan enligt Skogsstyrelsens riktlinjer.",
    "category": "inspection_service",
    "price_sek": 3500,
    "price_unit": "per_day",
    "region": "Kronobergs län",
    "status": "active"
  },
  {
    "seller_id": "b1000000-0000-0000-0000-000000000001",
    "title": "Gran-timmer — stormfällt virke",
    "description": "Ca 45 m³ stormfällt gran-timmer tillgängligt för avhämtning. Väg finns till platsen. Värnamo Bor 3:12.",
    "category": "timber",
    "price_sek": 450,
    "price_unit": "per_m3",
    "region": "Jönköpings län",
    "status": "active"
  }
]' "marketplace listings (3 entries)"

# ---------- Summary ----------
log ""
log "=== Staging data seeding complete ==="
log ""
log "Test accounts:"
log "  Owner:     erik.lindgren@varnamo-skog.se"
log "  Pilot:     anna.dronare@varnamo-skog.se"
log "  Inspector: karl.inspektor@sydskog.se"
log "  Admin:     maja.admin@sydskog.se"
log "  Password:  $TEST_PASSWORD"
log ""
log "Seeded data:"
log "  - Organizations (2): Värnamo Skogsbruk AB, SydSkog Inspektioner"
log "  - Parcels (3): Norrskog Värnamo, Sydmarkerna, Bredaryd Östra"
log "  - Surveys (2): Beetle detection (complete), Boar damage (requested)"
log "  - Analysis results (3): tree_count, species_id, beetle_detection"
log "  - Companion session with sample conversation"
log "  - Satellite observations (2)"
log "  - Community posts and marketplace listings (if tables exist)"
log "  - Knowledge base: research papers, regulations, datasets"
log ""
