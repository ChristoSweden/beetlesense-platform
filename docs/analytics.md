# PostHog Analytics Plan

> Every key user event tracked in BeetleSense.ai.
> Analytics provider: PostHog (self-hosted or cloud).
> All events use the `posthog.capture()` client SDK or server-side API.

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Event Categories](#event-categories)
   - [Auth Events](#auth-events)
   - [Navigation Events](#navigation-events)
   - [Onboarding Events](#onboarding-events)
   - [Parcel Events](#parcel-events)
   - [Survey Events](#survey-events)
   - [AI Companion Events](#ai-companion-events)
   - [Capture Events](#capture-events)
   - [Report Events](#report-events)
   - [Map Events](#map-events)
   - [Feedback Events](#feedback-events)
   - [Community Events](#community-events)
   - [Marketplace Events](#marketplace-events)
   - [Pilot Events](#pilot-events)
   - [Settings Events](#settings-events)
   - [Admin Events](#admin-events)
   - [Error Events](#error-events)
   - [Performance Events](#performance-events)
3. [User Properties](#user-properties)
4. [Group Properties](#group-properties)
5. [Funnel Definitions](#funnel-definitions)
6. [Feature Adoption Metrics](#feature-adoption-metrics)
7. [Dashboards](#dashboards)

---

## Naming Conventions

- **Format**: `category.action` (lowercase, dot-separated)
- **Actions**: `viewed`, `clicked`, `created`, `updated`, `deleted`, `started`, `completed`, `failed`, `searched`, `shared`, `dismissed`
- **Properties**: snake_case
- All events include automatic PostHog properties ($current_url, $browser, $device_type, $os, etc.)
- All events include `user_role` (owner/pilot/inspector/admin) as a super property set at login

---

## Event Categories

### Auth Events

| Event Name              | Properties                                     | Trigger |
|-------------------------|------------------------------------------------|---------|
| `auth.signup_started`   | `{method: 'email'|'google'|'bankid', role: string}` | User clicks "Skapa konto" |
| `auth.signup_completed` | `{method, role, time_to_complete_ms}`          | Account created successfully |
| `auth.signup_failed`    | `{method, error_code, error_message}`          | Signup fails (409, 422, etc.) |
| `auth.login_started`    | `{method}`                                     | User clicks "Logga in" |
| `auth.login_completed`  | `{method, time_since_last_login_days}`         | Login succeeds |
| `auth.login_failed`     | `{method, error_code}`                         | Login fails (401, etc.) |
| `auth.logout`           | `{session_duration_min}`                       | User logs out |
| `auth.password_reset_requested` | `{}`                                  | User clicks "Glomt losenord" |
| `auth.password_reset_completed` | `{}`                                  | Password successfully reset |

---

### Navigation Events

| Event Name              | Properties                                     | Trigger |
|-------------------------|------------------------------------------------|---------|
| `nav.page_viewed`       | `{page_name, page_path, referrer_path}`        | Any page load (auto-captured by PostHog `$pageview`) |
| `nav.tab_switched`      | `{screen, from_tab, to_tab}`                   | User switches tabs on any tabbed screen |
| `nav.bottom_nav_tapped` | `{item: 'home'|'map'|'capture'|'ai'|'settings'}` | Bottom nav item tapped |
| `nav.back_pressed`      | `{from_page}`                                  | Back button pressed |
| `nav.deep_link_opened`  | `{url, source}`                                | App opened via deep link |
| `nav.drawer_opened`     | `{drawer_name}`                                | Side drawer opened |

---

### Onboarding Events

| Event Name                    | Properties                                     | Trigger |
|-------------------------------|------------------------------------------------|---------|
| `onboarding.started`         | `{role}`                                       | User enters onboarding flow |
| `onboarding.step_viewed`     | `{step_number, step_name, role}`               | Each onboarding step rendered |
| `onboarding.step_completed`  | `{step_number, step_name, time_on_step_sec}`   | User completes a step ("Nasta") |
| `onboarding.step_skipped`    | `{step_number, step_name}`                     | User skips optional step |
| `onboarding.parcel_added`    | `{method: 'search'|'pin'|'manual', area_ha}`   | First parcel created during onboarding |
| `onboarding.satellite_triggered` | `{parcel_id}`                              | Satellite health check auto-triggered |
| `onboarding.first_win`       | `{time_to_first_win_sec, role}`                | User sees first AI insight on dashboard |
| `onboarding.completed`       | `{role, total_time_sec, steps_completed, steps_skipped}` | Onboarding finishes |
| `onboarding.abandoned`       | `{role, last_step_number, last_step_name, time_spent_sec}` | User leaves onboarding without completing |

---

### Parcel Events

| Event Name              | Properties                                     | Trigger |
|-------------------------|------------------------------------------------|---------|
| `parcel.list_viewed`    | `{count, filter_applied}`                      | Parcel list page loaded |
| `parcel.detail_viewed`  | `{parcel_id, area_ha, county}`                 | Parcel detail page loaded |
| `parcel.created`        | `{parcel_id, method: 'onboarding'|'manual'|'import', area_ha, county, municipality}` | New parcel saved |
| `parcel.updated`        | `{parcel_id, fields_changed: string[]}`        | Parcel details edited |
| `parcel.deleted`        | `{parcel_id, area_ha}`                         | Parcel removed |
| `parcel.boundary_edited`| `{parcel_id, edit_type: 'draw'|'upload'|'lantmateriet'}` | Boundary geometry modified |
| `parcel.shared`         | `{parcel_id, share_role, method: 'email'|'link'}` | Parcel shared with another user |
| `parcel.open_data_loaded`| `{parcel_id, source, load_time_ms}`           | Open data layer fetched for parcel |
| `parcel.searched`       | `{query, result_count}`                        | Parcel search executed |
| `parcel.filtered`       | `{filter_type, filter_value}`                  | Parcel list filtered |

---

### Survey Events

| Event Name                 | Properties                                     | Trigger |
|----------------------------|------------------------------------------------|---------|
| `survey.list_viewed`       | `{count, status_filter}`                       | Survey list page loaded |
| `survey.detail_viewed`     | `{survey_id, status, module_count}`            | Survey detail page loaded |
| `survey.created`           | `{survey_id, parcel_id, modules: string[], priority}` | New survey request created |
| `survey.status_changed`    | `{survey_id, from_status, to_status}`          | Survey status transitions |
| `survey.upload_started`    | `{survey_id, upload_type, file_size_mb}`       | File upload begins |
| `survey.upload_completed`  | `{survey_id, upload_type, file_size_mb, duration_sec}` | File upload succeeds |
| `survey.upload_failed`     | `{survey_id, upload_type, error_code}`         | File upload fails |
| `survey.processing_started`| `{survey_id, modules: string[]}`               | Processing pipeline begins |
| `survey.processing_completed`| `{survey_id, duration_min, modules_completed}` | All modules complete |
| `survey.processing_failed` | `{survey_id, failed_module, error_code}`       | Processing fails |
| `survey.module_result_viewed`| `{survey_id, module, confidence_score}`       | User views a specific module's results |

---

### AI Companion Events

| Event Name                    | Properties                                     | Trigger |
|-------------------------------|------------------------------------------------|---------|
| `companion.session_started`  | `{session_id, parcel_context: boolean}`        | User opens a new chat or resumes a session |
| `companion.message_sent`     | `{session_id, message_length, has_parcel_context, is_suggestion}` | User sends a message |
| `companion.response_received`| `{session_id, response_length, latency_ms, source_count, model}` | AI response fully received |
| `companion.response_failed`  | `{session_id, error_code}`                     | AI response fails |
| `companion.suggestion_tapped`| `{session_id, suggestion_text}`                | User taps a quick-suggestion chip |
| `companion.citation_tapped`  | `{session_id, source_type: 'research'|'regulatory'|'user_data'|'web', source_id}` | User taps a citation card |
| `companion.session_rated`    | `{session_id, rating: 1-5, message_count}`     | User rates a session (if implemented) |
| `companion.intent_classified`| `{session_id, intent, confidence}`             | Server-side: intent classifier result |
| `companion.guardrail_triggered`| `{session_id, guardrail_type, query_summary}` | Server-side: guardrail blocked a response |
| `companion.context_switched` | `{session_id, from_parcel, to_parcel}`         | User changes parcel context mid-conversation |

---

### Capture Events

| Event Name                  | Properties                                     | Trigger |
|-----------------------------|------------------------------------------------|---------|
| `capture.camera_opened`    | `{survey_context: boolean}`                    | Camera viewfinder opened |
| `capture.camera_failed`    | `{error_code, error_reason}`                   | Camera permission denied or hardware error |
| `capture.photo_taken`      | `{survey_id, has_gps, quality_score}`          | Shutter pressed and photo saved |
| `capture.quality_passed`   | `{survey_id, score}`                           | Photo passes quality gate |
| `capture.quality_failed`   | `{survey_id, score, reason: 'blurry'|'dark'|'no_subject'}` | Photo fails quality gate |
| `capture.photo_uploaded`   | `{survey_id, file_size_mb, was_offline}`       | Photo uploaded to server |
| `capture.gallery_viewed`   | `{photo_count}`                                | Gallery opened |
| `capture.offline_queued`   | `{photo_count, total_size_mb}`                 | Photos queued for offline upload |
| `capture.offline_synced`   | `{photo_count, total_size_mb, wait_time_min}`  | Offline queue synced when back online |

---

### Report Events

| Event Name                | Properties                                     | Trigger |
|---------------------------|------------------------------------------------|---------|
| `report.list_viewed`      | `{count}`                                      | Reports list loaded |
| `report.detail_viewed`    | `{report_id, report_type}`                     | Report detail/PDF preview loaded |
| `report.generation_started`| `{report_id, report_type, language}`          | Report generation triggered |
| `report.generation_completed`| `{report_id, report_type, duration_sec}`    | Report PDF generated |
| `report.generation_failed`| `{report_id, error_code}`                      | Report generation fails |
| `report.downloaded`       | `{report_id, report_type, format: 'pdf'}`      | User downloads report |
| `report.shared`           | `{report_id, share_method: 'email'|'link', recipient_count}` | Report shared |

---

### Map Events

| Event Name              | Properties                                     | Trigger |
|-------------------------|------------------------------------------------|---------|
| `map.viewed`            | `{zoom_level, center_lat, center_lng}`         | Map page loaded |
| `map.layer_toggled`     | `{layer_name, enabled: boolean}`               | User toggles a map layer (NDVI, satellite, beetle risk, etc.) |
| `map.parcel_tapped`     | `{parcel_id}`                                  | User taps a parcel boundary on the map |
| `map.zoomed`            | `{from_zoom, to_zoom}`                         | Zoom level changes (debounced) |
| `map.panned`            | `{distance_km}`                                | Map panned significantly (debounced, >1km) |
| `map.gps_located`       | `{accuracy_m}`                                 | "Locate me" button pressed |
| `map.tiles_failed`      | `{layer_name, error_code}`                     | Tile loading failure |

---

### Feedback Events

| Event Name                | Properties                                     | Trigger |
|---------------------------|------------------------------------------------|---------|
| `feedback.widget_opened`  | `{screen_path}`                               | Feedback widget opened |
| `feedback.widget_closed`  | `{screen_path, had_input: boolean}`           | Feedback widget closed without submitting |
| `feedback.submitted`      | `{rating, category, has_message, has_screenshot, screen_path}` | Feedback submitted |
| `feedback.submit_failed`  | `{error_code}`                                | Feedback submission fails |

---

### Community Events

| Event Name                   | Properties                                     | Trigger |
|------------------------------|------------------------------------------------|---------|
| `community.feed_viewed`     | `{category_filter, post_count}`                | Community feed loaded |
| `community.post_created`    | `{category, has_image, has_location, tag_count}` | New community post published |
| `community.post_viewed`     | `{post_id, category}`                          | Post detail viewed |
| `community.post_liked`      | `{post_id}`                                    | Post liked |
| `community.post_unliked`    | `{post_id}`                                    | Like removed |
| `community.comment_created` | `{post_id, is_reply: boolean}`                 | Comment posted |
| `community.post_reported`   | `{post_id, reason}`                            | Post reported for moderation |

---

### Marketplace Events

| Event Name                       | Properties                                     | Trigger |
|----------------------------------|------------------------------------------------|---------|
| `marketplace.listing_viewed`     | `{listing_id, category}`                       | Listing detail viewed |
| `marketplace.listing_created`    | `{listing_id, category, price_type}`           | New listing published |
| `marketplace.booking_created`    | `{listing_id, booking_id, total_price}`        | Booking request sent |
| `marketplace.booking_confirmed`  | `{booking_id}`                                 | Provider confirms booking |
| `marketplace.booking_completed`  | `{booking_id, total_price}`                    | Booking marked complete |
| `marketplace.review_submitted`   | `{booking_id, rating}`                         | Review posted after booking |
| `marketplace.searched`           | `{query, category_filter, result_count}`       | Marketplace searched |
| `marketplace.quote_requested`    | `{service_type, is_targeted: boolean}`         | Quote request submitted |

---

### Pilot Events

| Event Name                    | Properties                                     | Trigger |
|-------------------------------|------------------------------------------------|---------|
| `pilot.job_board_viewed`     | `{available_job_count}`                        | Pilot job board loaded |
| `pilot.job_viewed`           | `{job_id, fee_sek, distance_km}`               | Job detail page loaded |
| `pilot.job_applied`          | `{job_id, proposed_fee_sek}`                   | Pilot applies for job |
| `pilot.job_assigned`         | `{job_id}`                                     | Pilot assigned to a job |
| `pilot.job_completed`        | `{job_id, fee_sek, flight_duration_min}`       | Pilot marks job complete |
| `pilot.earnings_viewed`     | `{total_earnings_sek, period}`                 | Earnings page loaded |
| `pilot.profile_updated`     | `{fields_changed: string[]}`                   | Pilot profile edited |
| `pilot.mission_planned`     | `{mission_type, parcel_area_ha}`               | DJI waypoint mission created |
| `pilot.flight_logged`       | `{duration_min, distance_km, altitude_max_m}`  | Flight log recorded |

---

### Settings Events

| Event Name                      | Properties                                     | Trigger |
|---------------------------------|------------------------------------------------|---------|
| `settings.page_viewed`         | `{section}`                                    | Settings page loaded |
| `settings.profile_updated`     | `{fields_changed: string[]}`                   | Profile info saved |
| `settings.language_changed`    | `{from_lang, to_lang}`                         | Language preference changed |
| `settings.notifications_changed`| `{notification_type, enabled: boolean}`        | Notification toggle changed |
| `settings.plan_upgrade_started`| `{from_plan, to_plan}`                         | User begins plan upgrade |
| `settings.plan_upgrade_completed`| `{from_plan, to_plan, billing_cycle}`         | Plan upgrade confirmed |
| `settings.data_export_requested`| `{format}`                                    | User requests data export |
| `settings.account_deletion_requested`| `{}`                                      | User initiates account deletion |
| `settings.pwa_install_prompted`| `{platform: 'android'|'ios'|'desktop'}`        | PWA install prompt shown |
| `settings.pwa_installed`       | `{platform}`                                   | PWA installed |

---

### Admin Events

| Event Name                      | Properties                                     | Trigger |
|---------------------------------|------------------------------------------------|---------|
| `admin.dashboard_viewed`       | `{}`                                           | Admin dashboard loaded |
| `admin.user_searched`          | `{query, result_count}`                        | Admin searches users |
| `admin.user_role_changed`      | `{target_user_id, from_role, to_role}`         | Admin changes user role |
| `admin.user_banned`            | `{target_user_id, reason}`                     | Admin bans a user |
| `admin.pilot_approved`         | `{target_user_id}`                             | Admin approves pilot application |
| `admin.pilot_rejected`         | `{target_user_id, reason}`                     | Admin rejects pilot application |
| `admin.post_hidden`            | `{post_id, reason}`                            | Admin hides a community post |
| `admin.feedback_triaged`       | `{feedback_id, new_status}`                    | Admin triages feedback |
| `admin.system_health_viewed`   | `{}`                                           | System health page loaded |
| `admin.error_logs_viewed`      | `{filter, count}`                              | Error logs page loaded |
| `admin.config_changed`         | `{config_key, old_value, new_value}`           | System config changed |

---

### Error Events

| Event Name              | Properties                                     | Trigger |
|-------------------------|------------------------------------------------|---------|
| `error.displayed`       | `{error_code, screen_path, component}`         | Error state shown to user |
| `error.retry_clicked`   | `{error_code, screen_path, attempt_number}`    | User clicks retry on error state |
| `error.support_clicked` | `{error_code, screen_path}`                    | User clicks "Kontakta oss" on error |
| `error.unhandled`       | `{message, stack_trace_summary, component, screen_path}` | Uncaught JS error (ErrorBoundary) |
| `error.network_offline` | `{screen_path, pending_actions_count}`         | Device goes offline |
| `error.network_restored`| `{offline_duration_sec}`                       | Device comes back online |
| `error.api_failure`     | `{endpoint, status_code, method, duration_ms}` | API call returns 4xx/5xx |

---

### Performance Events

| Event Name                    | Properties                                     | Trigger |
|-------------------------------|------------------------------------------------|---------|
| `perf.page_load`             | `{page_name, ttfb_ms, fcp_ms, lcp_ms, cls}`   | Core Web Vitals on page load |
| `perf.api_latency`           | `{endpoint, method, duration_ms, status_code}` | Sampled API call timing (10% sample) |
| `perf.map_render`            | `{parcel_count, layer_count, render_time_ms}`  | Map first render timing |
| `perf.companion_ttfb`        | `{session_id, time_to_first_token_ms}`         | Time to first AI token |
| `perf.upload_speed`          | `{file_size_mb, duration_sec, mbps}`           | Upload throughput |
| `perf.offline_sync_duration` | `{item_count, total_size_mb, duration_sec}`    | Time to sync offline queue |

---

## User Properties

Set once at signup and updated on profile changes via `posthog.identify()`:

| Property            | Type   | Example          | Notes |
|---------------------|--------|------------------|-------|
| `user_role`         | string | 'owner'          | Primary role: owner, pilot, inspector, admin |
| `organization_id`   | string | UUID             | For group analytics |
| `organization_name` | string | 'Varnamo Skogsbruk' |    |
| `organization_type` | string | 'forest_owner'   |       |
| `billing_plan`      | string | 'pro'            |       |
| `language`          | string | 'sv'             |       |
| `region`            | string | 'Smaland'        |       |
| `onboarded`         | boolean| true             |       |
| `parcel_count`      | number | 3                | Updated on parcel create/delete |
| `survey_count`      | number | 7                | Updated on survey create |
| `signup_date`       | string | '2026-03-15'     | ISO date |
| `last_active`       | string | '2026-03-21'     | Updated on each session |
| `platform`          | string | 'pwa'            | pwa, browser, or native |

---

## Group Properties

Set via `posthog.group('organization', org_id)`:

| Property         | Type   | Notes |
|------------------|--------|-------|
| `name`           | string | Organization name |
| `org_type`       | string | forest_owner, inspection_firm, etc. |
| `billing_plan`   | string | starter, professional, enterprise |
| `member_count`   | number | Active members in org |
| `parcel_count`   | number | Total parcels in org |
| `created_at`     | string | ISO date |

---

## Funnel Definitions

### 1. Signup to First Win

The critical onboarding funnel. Target: >60% completion.

```
Step 1: auth.signup_started
Step 2: auth.signup_completed
Step 3: onboarding.started
Step 4: onboarding.parcel_added
Step 5: onboarding.first_win
```

**Breakdowns**: by `role`, by `method` (email/google/bankid), by `device_type`
**Time window**: 30 minutes

### 2. Signup to First Survey

Measures activation depth beyond onboarding.

```
Step 1: auth.signup_completed
Step 2: parcel.created
Step 3: survey.created
Step 4: survey.upload_completed
Step 5: survey.processing_completed
Step 6: survey.module_result_viewed
```

**Time window**: 30 days
**Breakdowns**: by `role`, by `billing_plan`

### 3. AI Companion Engagement

Measures if users find the AI useful.

```
Step 1: companion.session_started
Step 2: companion.message_sent
Step 3: companion.response_received
Step 4: companion.citation_tapped (or second message_sent)
Step 5: companion.message_sent (3rd+ message = engaged session)
```

**Time window**: 1 session
**Breakdowns**: by `has_parcel_context`, by `role`

### 4. Pilot Job Lifecycle

Measures pilot marketplace efficiency.

```
Step 1: pilot.job_board_viewed
Step 2: pilot.job_viewed
Step 3: pilot.job_applied
Step 4: pilot.job_assigned
Step 5: pilot.job_completed
```

**Time window**: 14 days
**Breakdowns**: by region, by fee range

### 5. Report Sharing

Measures report value delivery.

```
Step 1: survey.processing_completed
Step 2: report.generation_started
Step 3: report.generation_completed
Step 4: report.detail_viewed
Step 5: report.shared OR report.downloaded
```

**Time window**: 7 days

### 6. Free to Paid Conversion

```
Step 1: auth.signup_completed (where billing_plan = 'gratis')
Step 2: settings.plan_upgrade_started
Step 3: settings.plan_upgrade_completed
```

**Time window**: 90 days
**Breakdowns**: by `role`, by `parcel_count`, by `survey_count`

---

## Feature Adoption Metrics

Track weekly active users (WAU) per feature to measure adoption.

| Feature              | Adoption Event                   | Power User Threshold (per week) |
|----------------------|----------------------------------|---------------------------------|
| Parcel Management    | `parcel.detail_viewed`           | 3+ views                       |
| Survey Pipeline      | `survey.created`                 | 1+ creation                    |
| AI Companion         | `companion.message_sent`         | 5+ messages                    |
| Photo Capture        | `capture.photo_taken`            | 3+ photos                      |
| Map View             | `map.viewed`                     | 2+ views                       |
| Reports              | `report.detail_viewed`           | 1+ view                        |
| Community            | `community.feed_viewed`          | 2+ views                       |
| Marketplace          | `marketplace.listing_viewed`     | 1+ view                        |
| Forest Archive       | Archive page view                | 1+ view                        |
| Knowledge Notes      | Knowledge note created           | 1+ note                        |
| Document Vault       | Vault page view                  | 1+ view                        |
| Pilot Job Board      | `pilot.job_board_viewed`         | 3+ views (pilots only)         |
| Satellite Monitoring | `parcel.open_data_loaded`        | 1+ load (source = sentinel2)   |
| Feedback Widget      | `feedback.submitted`             | 1+ submission                  |
| Alerts               | Alert notification opened        | N/A (passive)                  |
| PWA Install          | `settings.pwa_installed`         | One-time event                 |

### Stickiness Metrics

- **DAU/MAU ratio**: overall and per role. Target: >25% for owners.
- **Feature retention**: of users who used a feature in week 1, what % used it in week 4?
- **Session frequency**: median sessions per week by role.
- **Session duration**: median time per session by role.

### North Star Metrics

| Role      | North Star Metric                              | Target          |
|-----------|-------------------------------------------------|-----------------|
| Owner     | Parcels with active satellite monitoring        | >80% of parcels |
| Pilot     | Jobs completed per month                        | >4 per pilot    |
| Inspector | Valuation reports generated per month           | >10 per inspector|
| Overall   | Weekly AI companion conversations (5+ messages) | >50% of WAU     |

---

## Dashboards

### 1. Executive Dashboard

- Total users (with growth %)
- MRR by plan
- Signup-to-first-win conversion rate
- Weekly active users (WAU) by role
- Parcel count growth
- Survey volume (processing pipeline load)

### 2. Product Health Dashboard

- Core Web Vitals (LCP, FID, CLS) by page
- API error rate (4xx, 5xx) by endpoint
- AI Companion latency (p50, p95)
- Offline sync success rate
- Upload success rate and speed

### 3. Feature Adoption Dashboard

- Feature adoption table (WAU per feature)
- Stickiness trend (DAU/MAU over time)
- New feature rollout tracking (PostHog feature flags)
- Funnel conversion rates over time

### 4. Support & Quality Dashboard

- Feedback volume by category
- Average feedback rating
- Error rate by code
- Most common error codes (top 10)
- Unresolved error count trend
