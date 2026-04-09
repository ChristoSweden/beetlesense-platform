# BeetleSense — Deployment Runbook & Launch Checklist

> Forest intelligence platform. Turborepo monorepo — the deployable app is at `apps/web`.
> Tech stack: React + Vite + TypeScript, Supabase (auth/DB/storage/realtime), Stripe (billing), Vercel (hosting).

---

## 1. Environment Variables

### Browser-safe variables (VITE_ prefix — bundled into the frontend)

These are safe to expose to the public. Set them in Vercel.

| Variable | What it does | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for browser calls | Supabase → Project Settings → API → anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe key for checkout — safe for browser | Stripe dashboard → Developers → API Keys → Publishable key (starts with `pk_`) |
| `VITE_VAPID_PUBLIC_KEY` | Web push notifications (public half) | Generate with `npx web-push generate-vapid-keys` |
| `VITE_SENTRY_DSN` | Error monitoring | Sentry → Project → Settings → Client Keys (DSN) |
| `VITE_POSTHOG_KEY` | Analytics | PostHog → Project Settings → Project API Key |
| `VITE_POSTHOG_HOST` | PostHog ingest URL | Use `https://eu.i.posthog.com` for EU data residency |
| `VITE_LANTMATERIET_API_KEY` | Swedish property registry lookups | See Section 4 |
| `VITE_SENTINEL_HUB_CLIENT_ID` | Satellite imagery (Sentinel-2) — OAuth client ID | See Section 4 |
| `VITE_SENTINEL_HUB_CLIENT_SECRET` | Satellite imagery — OAuth secret | See Section 4 |
| `VITE_MAPLIBRE_STYLE` | Custom map tile style URL (optional) | Leave empty to use built-in OSM style |
| `VITE_BYPASS_AUTH` | Skip auth for demos — **must be `false` in production** | Set to `false` |
| `VITE_ENABLE_DEMO` | Show demo/try buttons — set to `false` in production | Set to `false` |

### Server-only variables (set as Supabase Edge Function secrets — never in frontend)

These must **never** have the `VITE_` prefix. Set them via `supabase secrets set`.

| Variable | What it does | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe server-side billing operations | Stripe → Developers → API Keys → Secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures | Stripe → Developers → Webhooks → select endpoint → Signing secret |
| `STRIPE_PRO_PRICE_ID` | The Stripe Price ID for the Pro plan | Stripe → Products → your Pro product → copy Price ID |
| `RESEND_API_KEY` | Transactional emails | [https://resend.com](https://resend.com) → API Keys |
| `VAPID_PRIVATE_KEY` | Web push (private half — never expose to browser) | Same keygen as `VITE_VAPID_PUBLIC_KEY` |
| `VAPID_PUBLIC_KEY` | Server-side copy of the VAPID public key | Same as `VITE_VAPID_PUBLIC_KEY` |
| `VAPID_SUBJECT` | Contact URL for push notifications | Set to `mailto:hello@beetlesense.ai` |
| `GOOGLE_API_KEY` | Google Gemini embeddings for knowledge search | [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `ANTHROPIC_API_KEY` | AI companion chat (Claude) | [https://console.anthropic.com](https://console.anthropic.com) → API Keys |
| `DRONEDEPLOY_API_KEY` | DroneDeploy integration | [https://www.dronedeploy.com](https://www.dronedeploy.com) → Account → API |
| `EFI_API_KEY` | EFI ForestWard Observatory data feed | Contact grants@efi.int (see Section 7) |
| `EFI_API_ENDPOINT` | EFI API endpoint URL | `https://api.forestward.efi.int/v1/contributions` |
| `WORKER_API_SECRET` | Shared secret for internal worker-to-function calls | Generate a random 32-character string |
| `WORKER_API_URL` | URL of your worker service if self-hosted | Set to your worker endpoint |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for Edge Function CORS | Set to your production domain e.g. `https://app.beetlesense.ai` |

---

## 2. Supabase Setup

### 2a. Create a new Supabase project

1. Go to [https://supabase.com](https://supabase.com) → New Project
2. Choose `eu-west-1` (Ireland) for GDPR compliance
3. Save the database password

### 2b. Apply migrations in order

```bash
# Install Supabase CLI
npm install -g supabase

# Log in and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

If applying manually via the SQL editor, run them in this exact order:

**Core schema (numbered files first):**

1. `supabase/migrations/000_extensions.sql` — PostgreSQL extensions (pgvector, pg_cron, etc.)
2. `supabase/migrations/001_core_schema.sql` — users, parcels, profiles
3. `supabase/migrations/002_analysis.sql` — beetle analysis tables
4. `supabase/migrations/003_knowledge_base.sql` — AI knowledge base
5. `supabase/migrations/004_alerts.sql` — alert system
6. `supabase/migrations/005_sharing.sql` — parcel sharing
7. `supabase/migrations/006_community.sql` — forum and community
8. `supabase/migrations/007_marketplace.sql` — marketplace
9. `supabase/migrations/008_compliance.sql` — compliance reporting
10. `supabase/migrations/009_archive.sql` — data archiving
11. `supabase/migrations/010_knowledge_notes.sql` — knowledge notes
12. `supabase/migrations/011_document_vault.sql` — document vault
13. `supabase/migrations/012_quote_requests.sql` — quote requests
14. `supabase/migrations/013_google_embeddings.sql` — vector embeddings
15. `supabase/migrations/014_sensor_products.sql` — sensor integrations
16. `supabase/migrations/015_pilot_jobs.sql` — drone pilot jobs
17. `supabase/migrations/016_dji_integration.sql` — DJI drone integration
18. `supabase/migrations/017_airspace.sql` — airspace data
19. `supabase/migrations/018_billing.sql` — Stripe billing tables

**Dated patches (apply after numbered migrations):**

20. `supabase/migrations/20260321_feedback_errorlogs_audit.sql`
21. `supabase/migrations/20260322_webhook_events.sql`
22. `supabase/migrations/20260331_production_hardening.sql`
23. `supabase/migrations/20260406_alert_system.sql`
24. `supabase/migrations/20260406_document_signing.sql`
25. `supabase/migrations/20260406_forum_enhancements.sql`
26. `supabase/migrations/20260406_gov_submissions.sql`
27. `supabase/migrations/20260406_lease_management.sql`
28. `supabase/migrations/20260406_multi_owner.sql`
29. `supabase/migrations/20260406_parcel_wiki.sql`
30. `supabase/migrations/20260406_profit_tracker.sql`
31. `supabase/migrations/20260406_transactions.sql`
32. `supabase/migrations/20260406_weather_stations.sql`
33. `supabase/migrations/20260407_pest_intelligence.sql`
34. `supabase/migrations/20260408_delete_user_data.sql`
35. `supabase/migrations/20260409_parcels_rls_hardening.sql`

### 2c. Enable Realtime

In Supabase dashboard → Database → Replication, enable realtime for:
- `alerts`
- `analysis_results`
- `messages` (if applicable)

### 2d. Enable Storage

In Supabase dashboard → Storage, create these buckets:
- `parcel-documents` — private, for uploaded PDF reports
- `analysis-images` — private, for beetle detection images
- `avatars` — public, for user profile photos

---

## 3. Stripe Setup

### Step 1 — Create products and prices

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) → Products → Add product
2. Create a **Pro** plan with monthly and annual pricing options
3. Copy the Price ID (starts with `price_`) for the monthly or primary plan
4. Set `STRIPE_PRO_PRICE_ID` in Supabase secrets to this value

### Step 2 — Create a webhook endpoint

1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`) from the endpoint detail page
6. Set it as `STRIPE_WEBHOOK_SECRET` in Supabase secrets

### Step 3 — Set Stripe secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
```

**Important:** Use `sk_test_...` and `pk_test_...` keys for staging, `sk_live_...` and `pk_live_...` for production.

---

## 4. API Keys to Obtain

### Sentinel Hub (satellite imagery)

Required for live Sentinel-2 NDVI, moisture, and bark beetle stress analysis.

1. Register at [https://apps.sentinel-hub.com/dashboard](https://apps.sentinel-hub.com/dashboard)
2. Create a new **OAuth client** (not API key)
3. Copy the **Client ID** and **Client Secret**
4. Set `VITE_SENTINEL_HUB_CLIENT_ID` and `VITE_SENTINEL_HUB_CLIENT_SECRET` in Vercel

Without this key the app will show cached or placeholder satellite data.

### Lantmäteriet (Swedish property registry)

Required for accurate parcel boundary lookups from Fastighetsregistret.

1. Register at [https://www.lantmateriet.se/en/geodata/](https://www.lantmateriet.se/en/geodata/)
2. Apply for a developer/API account
3. Once approved, find your API key in the developer portal
4. Set `VITE_LANTMATERIET_API_KEY` in Vercel

Without this key the app falls back to the free WMS endpoint (less precise boundaries).

### EFI ForestWard Observatory (G-01-2026 grant)

Required for Copernicus data integration and biodiversity reporting under the EFI grant.

1. Contact EFI directly: **grants@efi.int** or **forwards@efi.int**
2. Reference grant **G-01-2026** (EFI ForestWard Observatory)
3. Request API credentials for the ForestWard data feed
4. Once received, set via Supabase secrets (never in the frontend):

```bash
supabase secrets set EFI_API_KEY=your-efi-api-key
supabase secrets set EFI_API_ENDPOINT=https://api.forestward.efi.int/v1/contributions
```

### Google Gemini (AI embeddings and knowledge search)

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Set as `GOOGLE_API_KEY` in Supabase secrets

### Anthropic (AI companion chat)

1. Go to [https://console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key
2. Set as `ANTHROPIC_API_KEY` in Supabase secrets

### Resend (transactional email)

1. Register at [https://resend.com](https://resend.com)
2. Create an API key
3. Add and verify your sending domain
4. Set as `RESEND_API_KEY` in Supabase secrets

---

## 5. Edge Functions Deployment

Deploy all Edge Functions from the monorepo root:

```bash
# Deploy all functions at once
supabase functions deploy alerts-subscribe
supabase functions deploy assign-pilot
supabase functions deploy cancel-subscription
supabase functions deploy companion-chat
supabase functions deploy create-checkout-session
supabase functions deploy create-job
supabase functions deploy delete-account
supabase functions deploy dji-mission
supabase functions deploy dronedeploy-webhook
supabase functions deploy knowledge-search
supabase functions deploy news-refresh
supabase functions deploy parcel-register
supabase functions deploy parcel-share
supabase functions deploy request-quote
supabase functions deploy satellite-timeseries
supabase functions deploy send-alert
supabase functions deploy send-alert-confirmation
supabase functions deploy send-notification
supabase functions deploy share-invite
supabase functions deploy stripe-webhook
supabase functions deploy survey-status
supabase functions deploy timber-prices
supabase functions deploy upload-complete
supabase functions deploy upload-presign
supabase functions deploy vision-identify
supabase functions deploy weekly-digest
supabase functions deploy wiki-ingest
```

Then set all secrets at once:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRO_PRICE_ID=price_... \
  RESEND_API_KEY=re_... \
  GOOGLE_API_KEY=AIza... \
  ANTHROPIC_API_KEY=sk-ant-... \
  VAPID_PUBLIC_KEY=your-vapid-public \
  VAPID_PRIVATE_KEY=your-vapid-private \
  VAPID_SUBJECT=mailto:hello@beetlesense.ai \
  DRONEDEPLOY_API_KEY=your-key \
  EFI_API_KEY=your-efi-key \
  EFI_API_ENDPOINT=https://api.forestward.efi.int/v1/contributions \
  CORS_ALLOWED_ORIGINS=https://app.beetlesense.ai \
  WORKER_API_SECRET=your-32-char-random-string
```

---

## 6. Vercel Deployment

### Step 1 — Connect the repo

1. Vercel → New Project → import the `beetlesense-platform` GitHub repository
2. **Important:** Vercel will auto-detect the monorepo. When asked, set:
   - Root directory: leave as `/` (the monorepo root)
   - Build command: `pnpm --filter @beetlesense/web build`
   - Output directory: `apps/web/dist`
3. Framework preset: **Vite**

The `vercel.json` at the monorepo root already handles this:

```json
{
  "installCommand": "pnpm install --no-frozen-lockfile",
  "buildCommand": "pnpm --filter @beetlesense/web build",
  "outputDirectory": "apps/web/dist"
}
```

### Step 2 — Set all environment variables in Vercel

Set every variable from Section 1 (browser-safe variables only). Server-only variables go in Supabase secrets, not Vercel.

### Step 3 — Custom domain

1. Vercel → Project → Settings → Domains → Add domain (e.g. `app.beetlesense.ai`)
2. Set DNS CNAME/A record at your registrar
3. Update in Supabase: Authentication → URL Configuration → Site URL = `https://app.beetlesense.ai`
4. Add the URL to Supabase Auth Redirect URLs

### Step 4 — Verify the build works locally first

```bash
cd beetlesense-platform
pnpm install
pnpm build
```

The build must complete with zero TypeScript errors before deploying.

---

## 7. EFI Grant Requirements (G-01-2026)

The following features must be live and demonstrable before submitting the EFI ForestWard Observatory grant application:

- [ ] **Copernicus / Sentinel-2 integration** — satellite imagery loading for at least one parcel
- [ ] **Bark beetle forecast** — AI-generated beetle risk score visible on parcel dashboard
- [ ] **Biodiversity assessment** — biodiversity score or index shown per parcel
- [ ] **Fire risk indicator** — fire risk rating displayed (can be derived from NDVI/moisture)
- [ ] **Carbon tracking** — carbon calculator or carbon stock estimate shown per parcel
- [ ] **EFI API connection** — `EFI_API_KEY` set, data flowing into ForestWard endpoint
- [ ] **Working sign-up flow** — new users can register and add a parcel
- [ ] **Production deployment** — app accessible at a stable public URL

Contact for submission: **grants@efi.int**
Reference: **G-01-2026**

---

## 8. Post-Deploy Checklist

Run through each journey after every production deployment.

### Sign up

- [ ] Open the app on desktop and mobile
- [ ] Click **Sign Up** or **Get Started**
- [ ] Enter email and password (or use OAuth if configured)
- [ ] Confirmation email arrives from Resend
- [ ] Click confirmation link — redirected back to app
- [ ] Onboarding screen or dashboard appears

### Add a parcel

- [ ] Click **Add Parcel** or **New Property**
- [ ] Search for a parcel by address or property ID
- [ ] Parcel boundary appears on the map
- [ ] Confirm and save the parcel
- [ ] Parcel appears in the dashboard

### View satellite imagery

- [ ] Open a parcel's detail view
- [ ] Satellite view tab loads
- [ ] Sentinel-2 NDVI or natural colour image loads (may take a few seconds)
- [ ] Timeline or date slider is usable

### Set an alert

- [ ] Open a parcel's settings or alerts section
- [ ] Create a beetle risk alert (e.g. "notify me when risk is high")
- [ ] Save the alert

### Receive confirmation email

- [ ] The alert confirmation email arrives within 60 seconds
- [ ] Email is from your Resend-verified sending domain
- [ ] Links in the email work

### Billing upgrade

- [ ] Navigate to Settings → Billing or Upgrade
- [ ] Click **Upgrade to Pro**
- [ ] Stripe Checkout opens in the browser
- [ ] Enter test card `4242 4242 4242 4242` with any future date and any CVC
- [ ] Checkout completes and redirects back to the app
- [ ] Account is now showing Pro status

---

## 9. Monitoring

### Sentry (error tracking)

1. Create a project at [https://sentry.io](https://sentry.io) → Browser JavaScript
2. Set `VITE_SENTRY_DSN` in Vercel
3. Create an alert rule for any new issue → email notification

### PostHog (product analytics)

1. Log in at [https://eu.i.posthog.com](https://eu.i.posthog.com) (EU endpoint for GDPR)
2. Set `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in Vercel
3. Key funnel: Sign up → Add parcel → View satellite → Set alert → Upgrade
4. Monitor drop-off at the parcel-add step — that is the core activation moment

### Supabase monitoring

- Edge Function logs: Supabase dashboard → Edge Functions → select function → Logs
- Database slow queries: Supabase dashboard → Database → Query Performance
- Auth events: Supabase dashboard → Authentication → Logs
- Storage usage: Supabase dashboard → Storage

### Stripe

- Stripe dashboard → Developers → Webhooks → select your endpoint → Recent deliveries
- Verify `checkout.session.completed` events are being received and returning `200 OK`
- Set up a Stripe alert for failed payments: Stripe → Settings → Email notifications
