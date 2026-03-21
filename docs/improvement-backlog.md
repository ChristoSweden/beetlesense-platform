# BeetleSense.ai — Improvement Backlog

Sorted by **user impact** (highest first), not engineering effort.

---

## Priority 1 — Critical User Experience

### 1. Offline Mode Reliability
**Impact**: High — forest owners use the app in areas with poor or no connectivity.
**Current state**: Service worker caches static assets but offline data sync is incomplete.
**Improvement**: Implement full offline-first architecture with background sync for parcels, surveys, and AI Companion conversation history. Queue uploads for automatic retry.
**Affected users**: All mobile field users (forest owners, drone pilots, inspectors).

### 2. Onboarding Funnel Completion
**Impact**: High — drop-off during parcel registration causes user churn before first value.
**Current state**: Onboarding exists but parcel registration via fastighets-ID is confusing for non-technical users.
**Improvement**: Add map-based parcel selection ("tap your forest on the map"), auto-suggest from Lantmäteriet, and guided walkthrough with progress indicator. Target: first win (parcel on map) in under 2 minutes.
**Affected users**: New forest owners.

### 3. AI Companion Response Time
**Impact**: High — slow responses break conversational flow and reduce trust.
**Current state**: First-token latency varies 3–8 seconds depending on context retrieval.
**Improvement**: Implement streaming responses with visible typing indicator, pre-fetch likely context chunks, optimize pgvector HNSW index parameters.
**Target**: <3s first token for 90th percentile.

### 4. Mobile Thumb-Reach Optimization
**Impact**: High — primary actions are out of thumb reach on some screens at 375px.
**Current state**: Some CTAs (like "New Survey" button) are at top of screen.
**Improvement**: Audit all screens at 375px, move primary actions to bottom sheet or FAB pattern, ensure all critical interactions are within one-handed thumb zone.

---

## Priority 2 — Feature Gaps

### 5. Push Notification Reliability
**Impact**: Medium-High — survey completion notifications drive re-engagement.
**Current state**: Web Push API implemented but delivery rates are low on iOS Safari.
**Improvement**: Add fallback email notifications, implement notification preferences per event type, add in-app notification center with unread badge.

### 6. Report PDF Quality
**Impact**: Medium-High — inspectors need professional, audit-ready reports.
**Current state**: Basic Puppeteer PDF generation with limited formatting.
**Improvement**: Custom report templates per persona (owner summary vs. inspector valuation table), branded headers/footers, chart rendering, map snapshot inclusion, multi-language support.

### 7. Smartphone Capture Quality Gate
**Impact**: Medium — low-quality photos waste processing time and produce unreliable results.
**Current state**: Basic blur detection exists.
**Improvement**: Add real-time viewfinder overlay with quality score, lighting assessment, GPS accuracy indicator, guided framing prompts ("point camera at tree trunk base"), reject before upload with clear next action.

### 8. Multi-Language Polish
**Impact**: Medium — Swedish translation coverage is incomplete.
**Current state**: i18next configured with EN/SV but many strings are only in English.
**Improvement**: Complete SV translations, add language detection, ensure all user-facing strings (including error messages and empty states) are translated.

---

## Priority 3 — Platform Maturity

### 9. Accessibility Audit Remediation
**Impact**: Medium — keyboard and screen reader users encounter dead ends.
**Current state**: Basic a11y components exist (SkipLinks, Announcer) but not all interactive elements have proper focus management.
**Improvement**: Full WCAG AA audit, add focus trap to all modals, ensure all form errors are announced, add aria-live regions for real-time updates, test with NVDA/VoiceOver.

### 10. Error Recovery Flows
**Impact**: Medium — users hit dead ends when errors occur.
**Current state**: Error boundaries catch crashes but recovery options are limited to "reload page."
**Improvement**: Implement retry logic for all async operations, add "undo" for destructive actions, persist form state across page reloads, add session recovery after expiry.

### 11. Performance Monitoring Pipeline
**Impact**: Medium — no automated performance regression detection.
**Current state**: Lighthouse runs manually; no CI/CD integration.
**Improvement**: Add Lighthouse CI to GitHub Actions, track Core Web Vitals per deploy, alert on regressions, add real user monitoring (RUM) via PostHog or web-vitals library.

### 12. Map Layer Loading Speed
**Impact**: Medium — map tiles and WMS layers are slow on first load.
**Current state**: Tiles load from OSM/MapTiler without pre-caching.
**Improvement**: Implement tile pre-caching for registered parcels, add progressive loading (low-res first), show skeleton map while tiles load, optimize vector tile rendering.

---

## Priority 4 — Nice to Have

### 13. Dark/Light Theme Toggle
**Impact**: Low — current dark theme is good but some users prefer light mode in field conditions.

### 14. Keyboard Shortcuts
**Impact**: Low — power users (drone pilots, inspectors) would benefit from keyboard navigation shortcuts.

### 15. Data Export Formats
**Impact**: Low — currently only PDF exports; some users want GeoJSON, CSV, and Shapefile exports.

### 16. Admin Dashboard Customization
**Impact**: Low — admin panels show fixed layouts; allow drag-and-drop panel arrangement.

---

*Last updated: 2026-03-21*
*Generated from Brutal Critic simulation and user persona analysis.*
