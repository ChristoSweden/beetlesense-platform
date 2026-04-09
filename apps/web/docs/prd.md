# BeetleSense — Product Requirements Document

*Updated post-build: April 2026*

---

## Problem Statement

Sweden loses 3–5 million cubic metres of timber to bark beetle infestations every year. The primary beetle, *Ips typographus* (the European spruce bark beetle), spreads rapidly across property boundaries and cannot be detected by eye until trees are already dead. Swedish forest owners — most managing less than 50 hectares — have no affordable, fast, or proactive tool to detect beetle activity before it becomes catastrophic.

Existing tools are either too expensive (Planet Labs), too generic (GlobalForestWatch), or too slow (human advisors). No product combines satellite monitoring, drone survey workflows, AI-powered risk scoring, and parcel-level management in one accessible platform.

---

## Target Users

**Primary: Swedish forest owners (skogsägare)**
- Own 5–500 ha of productive forest in Sweden
- Mix of active managers and passive inheritors
- Often not technically sophisticated — need Swedish-language UX
- Primary device: mobile (field use) + desktop (planning)

**Secondary: Certified forest pilots (drone operators)**
- Conduct contracted surveys for forest owners
- Need efficient job board, mission management, and data upload tools
- Tech-comfortable, mobile-first

**Tertiary: Forest inspectors and researchers**
- Verify survey data, access aggregated intelligence
- Desktop-primary

---

## Core Features (Built)

### Forest Owner (Owner role)
- Parcel registration via fastighets-ID lookup
- Satellite-based bark beetle risk monitoring (Sentinel-2)
- AI Companion (Wingman) for forestry Q&A and parcel-specific advice
- Survey creation and results viewer
- Capture (photo upload from field)
- Carbon calculator and carbon impact tracking
- Forest plan generator
- Reports (PDF export)
- Intel Hub — aggregated forest intelligence feed
- Alerts and early warning notifications
- Map view with WMS overlays (risk, LiDAR, satellite)
- Forum and community posts
- Bilingual (Swedish / English)

### Pilot role (drone operators)
- Job board and mission management
- Flight log
- Data upload and processing queue
- Earnings tracker

### Admin role
- User management
- Analytics dashboard (PostHog + Sentry)
- Feedback panel
- Content management

### Platform
- Supabase Auth (email + magic link)
- Demo mode (no signup required)
- PostHog analytics (full event catalog)
- Sentry error tracking (60+ structured error codes)
- Stripe billing (scaffolded)
- i18next (Swedish + English)

---

## Out of Scope (Current Build)

- Native iOS/Android apps (web PWA only)
- Live drone video streaming
- Timber marketplace transactions (scaffolded, not live)
- Insurance integrations (scaffolded, not live)
- Third-party forester directory (scaffolded)
- EFI data contribution pipeline (ForestWardObservatory page exists, integration pending)

---

## Success KPIs (3 Measurable)

### KPI 1: Onboarding completion rate
**Target**: 60% of new signups complete onboarding (register first parcel) within 7 days of signup
**Measurement**: PostHog funnel — `user_signed_up` → `onboarding_completed`

### KPI 2: Weekly active users running satellite checks
**Target**: 40% of registered forest owners view their parcel satellite data at least once per week
**Measurement**: PostHog event `parcel_viewed` with `source: satellite` — weekly unique users / total registered owners

### KPI 3: Survey-to-result completion rate
**Target**: 70% of created surveys reach `results_viewed` status within 30 days
**Measurement**: PostHog funnel — `survey_created` → `survey_results_viewed` within 30-day window

---

## Technical Constraints

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- Maps: MapLibre GL
- Satellite data: Sentinel Hub (Copernicus)
- Property data: Lantmäteriet API
- Analytics: PostHog (EU endpoint: eu.i.posthog.com)
- Error tracking: Sentry
- Payments: Stripe
- Deployment: Vercel (auto-deploy on push to main)
- Must work on mobile (375px+) and slow 4G connections
- Swedish GDPR compliance required

---

## EFI Grant Alignment Note

The EFI ForestWard Observatory Grant (G-01-2026) has strong alignment with BeetleSense's existing feature set: Copernicus/Sentinel data integration, biodiversity assessment tools, fire risk modelling, and carbon tracking are all built or in progress. The `ForestWardObservatoryPage.tsx` already exists. Completing the EFI data contribution pipeline is the highest-impact next step for institutional credibility.
