# BeetleSense.ai — Analytics & Error Tracking Setup Guide

Everything is installed and wired up. You just need to create accounts and paste in your keys.

---

## 1. PostHog Setup (Analytics)

PostHog tracks how users interact with BeetleSense — signups, parcel registrations, survey completions, AI Companion usage, and more.

### Steps

1. Go to [eu.posthog.com](https://eu.posthog.com) and create a free account (EU data residency)
2. Create a new project called "BeetleSense"
3. On the project settings page, find your **Project API Key** — it starts with `phc_`
4. Add it to your `.env` file:
   ```
   VITE_POSTHOG_KEY=phc_your_actual_key_here
   VITE_POSTHOG_HOST=https://eu.i.posthog.com
   ```
5. Restart the dev server (`pnpm dev`)

### How to verify it works

- Open the browser console — you should see: `[PostHog] Initialized`
- If you see `[PostHog] Skipped — no valid key`, your key is missing or still the placeholder
- In PostHog dashboard, go to "Live Events" — you should see `$pageview` events within seconds

### Events being tracked

| Event | When it fires |
|---|---|
| `user_signed_up` | User completes registration |
| `user_logged_in` | User logs in |
| `user_logged_out` | User logs out |
| `onboarding_started` | User begins onboarding |
| `onboarding_completed` | User finishes onboarding |
| `onboarding_skipped` | User skips an onboarding step |
| `parcel_registered` | User registers a new parcel |
| `parcel_viewed` | User views a parcel detail page |
| `survey_created` | User creates a new survey |
| `survey_viewed` | User views a survey |
| `survey_results_viewed` | User views survey results |
| `companion_opened` | User opens the AI Companion |
| `companion_message_sent` | User sends a message to AI Companion |
| `companion_rated` | User rates an AI Companion response |
| `capture_started` | User starts smartphone photo capture |
| `capture_completed` | User finishes capturing photos |
| `feedback_widget_opened` | User opens the feedback widget |
| `feedback_submitted` | User submits feedback |
| `report_generated` | A report is generated |
| `report_downloaded` | User downloads a report |
| `page_viewed` | User navigates to a page |
| `error_occurred` | An error occurs (mirrors Sentry) |

---

## 2. Sentry Setup (Error Tracking)

Sentry catches every error in the app, tagged with BeetleSense error codes (like `AUTH-001`, `MAP-003`).

### Steps

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project — choose **React** as the platform
3. Copy the **DSN** — it looks like `https://abc123@o123456.ingest.sentry.io/789`
4. Add it to your `.env` file:
   ```
   VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/0
   ```
5. Restart the dev server (`pnpm dev`)

### How to verify it works

- Open the browser console — you should see: `[Sentry] Initialized`
- If you see `[Sentry] Skipped — no valid DSN`, your DSN is missing or still the placeholder
- To test: open the browser console and run `throw new Error("test")` — it should appear in your Sentry dashboard within a minute

### Error code system

Every error in BeetleSense has a unique code like `AUTH-001` or `MAP-003`. When Sentry captures an error, it includes:
- **Tag `code`**: the error code (e.g., `DB-002`)
- **Tag `module`**: which part of the app (e.g., `DB`)
- **Extra data**: the user-facing message and suggested action

This makes it easy to search Sentry by error code and see exactly what happened.

Full error code catalog: [error-codes.md](./error-codes.md)

---

## 3. Vercel Environment Variables

When deploying to Vercel, set these in **Project Settings → Environment Variables**:

### Required

| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://adqtflzzowjyaullnelj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJ...` |

### Recommended

| Variable | Description | Example |
|---|---|---|
| `VITE_POSTHOG_KEY` | PostHog project API key | `phc_abc123` |
| `VITE_POSTHOG_HOST` | PostHog host (EU) | `https://eu.i.posthog.com` |
| `VITE_SENTRY_DSN` | Sentry DSN | `https://abc@sentry.io/0` |
| `VITE_APP_VERSION` | App version for tracking | `0.1.0` |

### Optional

| Variable | Description |
|---|---|
| `VITE_MAPLIBRE_STYLE` | Custom MapLibre style URL (defaults to OSM) |

> **Never put** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or any secret keys in `VITE_` variables — those are exposed to the browser. Backend-only keys go in Supabase Edge Functions or worker environment.

---

## 4. Verification Checklist

After setup, confirm each of these:

- [ ] **PostHog**: Open the app → check browser console for `[PostHog] Initialized` → check PostHog Live Events for pageviews
- [ ] **Sentry**: Open the app → check browser console for `[Sentry] Initialized` → trigger a test error → check Sentry dashboard
- [ ] **Feedback widget**: Click the green button (bottom-right) → select emoji → submit → check Supabase `feedback` table for new row
- [ ] **Admin dashboard**: Go to `/admin/feedback` → confirm the feedback you just submitted appears
- [ ] **Real-time**: Submit another feedback → confirm it appears in the admin panel without refreshing
- [ ] **Error codes**: In Sentry, check that captured errors have `code` and `module` tags

---

*Last updated: 2026-03-21*
