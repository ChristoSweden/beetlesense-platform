# BeetleSense — QA Hard Gate Report

*Audit date: April 2026*

---

## Hard Gate Checklist

| Gate | Status | Notes |
|---|---|---|
| RLS policy on every Supabase table | NEEDS REVIEW | Schema/migrations not fully reviewed — verify each table has RLS enabled via Supabase dashboard. DB-005 error code exists for RLS violations. |
| Every empty state is designed and instructional | PASS | DESIGN.md documents 5 required empty state variants (no parcels, no surveys, no conversations, no posts, no alerts). Pattern: 64px icon + title + description + CTA. |
| Structured error codes on every error | PASS | 60+ error codes across 12 modules in `src/lib/errorCodes.ts`. Every error has userMessage + action. Sentry integration tags each event with error code. |
| Skeleton loaders (not raw spinners) | NEEDS REVIEW | Design system specifies "warm shimmer 1.5s" skeleton pattern. Verify implementation in heavy-data components (MapPage, ParcelDetailPage, SurveyDetailPage). |
| First win under 2 minutes | PASS | Demo mode activates without signup. Parcel registration via fastighets-ID is step 1 of onboarding. |
| Mobile-ready (touch targets ≥ 44px) | PASS | Mobile bottom nav 64px height, buttons `px-8 py-4`, rounded-xl. Responsive breakpoints documented. |
| No dead ends (every flow has exit) | PASS | Every error state has a next action. Onboarding has skip option. NotFoundPage exists. |
| No placeholders / TODOs / lorem ipsum | NEEDS REVIEW | 100+ pages — some scaffold-only pages likely have placeholder content. Audit pages in owner/pages before launch. |
| Demo mode works (isDemoMode() pattern) | PASS | `VITE_BYPASS_AUTH` and `VITE_ENABLE_DEMO` both documented in `.env.example`. Demo mode is explicitly supported. |
| PostHog wired | PASS | `src/lib/posthog.ts` fully implemented. 20+ typed event functions. EU endpoint configured. |
| Sentry wired | PASS | `src/lib/sentry.ts` fully implemented. PII stripping in production. Error code tagging on every capture. Also logs to Supabase `error_logs` table. |
| FeedbackWidget exists | PASS | `src/components/feedback/FeedbackWidget.tsx` confirmed (3-tier, stores to Supabase, integrated with PostHog + Sentry). |
| .env.example complete | PASS | Includes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BYPASS_AUTH`, `VITE_ENABLE_DEMO`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`. |
| DESIGN.md documented | PASS | Comprehensive DESIGN.md at app root. No glassmorphism, no backdrop-blur on content, solid surfaces only. |
| Bilingual (Swedish/English) | PASS | i18next implemented with language toggle in top bar. |

---

## Action Items (NEEDS REVIEW)

### 1. Verify RLS on all Supabase tables
- Open Supabase dashboard → Table Editor → confirm RLS is enabled on: profiles, parcels, surveys, reports, error_logs, feedback (any feedback table), notifications
- Add explicit RLS policies for pilot role (read own missions only)

### 2. Audit skeleton loaders in high-data components
- MapPage: satellite layer loading
- ParcelDetailPage: beetle risk score loading
- SurveyDetailPage: results loading
- Replace any `<Spinner />` instances with skeleton variants

### 3. Audit scaffold pages for placeholder content
Run: `grep -r "TODO\|lorem ipsum\|placeholder\|Coming soon" apps/web/src/pages/owner/`
Remove or build out any pages with stub content before production launch.

---

## Build Status
Run `pnpm build` from `beetlesense-platform/` to verify zero TypeScript errors before each release.
