# BeetleSense — PostHog Analytics Event Schema

## Configuration
- Library: `posthog-js`
- Host: `https://eu.i.posthog.com` (EU endpoint — GDPR compliant)
- Env var: `VITE_POSTHOG_KEY`
- Implementation: `src/lib/posthog.ts`
- Manual instrumentation only (`autocapture: false`)

---

## KPI 1: Onboarding Completion Rate
**Target**: 60% of new signups complete onboarding (register first parcel) within 7 days

### Events

| Event | Properties | Trigger |
|---|---|---|
| `user_signed_up` | `method: 'magic_link' \| 'google' \| 'demo'` | On successful auth |
| `onboarding_started` | *(none)* | On OnboardingPage mount |
| `onboarding_skipped` | `step: string` | On skip button click |
| `parcel_registered` | `method: 'fastighets_id' \| 'manual_draw'` | On successful parcel save |
| `onboarding_completed` | `duration_ms: number` | On final onboarding step |

### Funnel in PostHog
```
Funnel: Signup → First Parcel
Step 1: user_signed_up
Step 2: onboarding_started
Step 3: parcel_registered
Step 4: onboarding_completed
Window: 7 days
```

### Alert
Set PostHog alert: if funnel conversion rate drops below 50% in a 7-day rolling window, trigger Slack notification.

---

## KPI 2: Weekly Active Satellite Checks
**Target**: 40% of registered owners view parcel satellite data at least once per week

### Events

| Event | Properties | Trigger |
|---|---|---|
| `parcel_viewed` | `parcel_id: string, source: 'satellite' \| 'map' \| 'alert' \| 'dashboard'` | On ParcelDetailPage mount |
| `satellite_layer_toggled` | `parcel_id: string, layer: string, enabled: boolean` | On map layer toggle |
| `page_viewed` | `path: string, role: string` | On every route change |

### Query in PostHog
```
Weekly Active Users (WAU):
- Filter: event = parcel_viewed AND source = satellite
- Group by: distinct_id (user)
- Aggregation: unique users per week
- Divide by: total users with parcel_registered event (lifetime)
```

### Dashboard panel
"Satellite WAU %" — line chart, 12-week rolling, target line at 40%.

---

## KPI 3: Survey-to-Result Completion Rate
**Target**: 70% of surveys created reach results_viewed within 30 days

### Events

| Event | Properties | Trigger |
|---|---|---|
| `survey_created` | `survey_id: string, modules: string[], module_count: number` | On survey creation |
| `survey_viewed` | `survey_id: string` | On SurveyDetailPage mount |
| `survey_results_viewed` | `survey_id: string` | On results tab activation |

### Funnel in PostHog
```
Funnel: Survey Created → Results Viewed
Step 1: survey_created
Step 2: survey_results_viewed (matched by survey_id property)
Window: 30 days
```

---

## Supporting Events (Full Catalog from posthog.ts)

| Event | Purpose |
|---|---|
| `user_logged_in` | Auth funnel |
| `user_logged_out` | Session end |
| `companion_opened` | AI Companion adoption |
| `companion_message_sent` | AI engagement depth |
| `companion_rated` | AI quality signal |
| `capture_started` / `capture_completed` | Photo capture funnel |
| `feedback_widget_opened` / `feedback_submitted` | Feedback collection rate |
| `report_generated` / `report_downloaded` | Report value delivery |
| `error_occurred` | Error rate (cross-reference with Sentry) |

---

## Admin Dashboard Panels (Priority Order)

1. KPI 1 funnel (signup → first parcel) — conversion %
2. KPI 2 satellite WAU % — weekly trend
3. KPI 3 survey completion funnel — 30-day rolling
4. Daily active users by role (owner / pilot / admin)
5. Top error codes by frequency (cross-ref Sentry)
6. Companion message volume — engagement health
7. Feature adoption heatmap — which pages are visited
