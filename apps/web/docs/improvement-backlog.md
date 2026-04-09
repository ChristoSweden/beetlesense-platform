# BeetleSense — Improvement Backlog

*Priority score = Impact (1–5) × Effort (1–5 where 1 = low effort)*
*Higher score = do first. Updated weekly from Monitor department inputs.*

*Last updated: April 2026*

---

## Priority Ranking

| # | Improvement | Impact | Effort | Score | Source |
|---|---|---|---|---|---|
| 1 | Complete EFI ForestWard Observatory data contribution pipeline | 5 | 2 | 10 | Strategic/Grant |
| 2 | Verify and enforce RLS on all Supabase tables | 5 | 2 | 10 | QA audit |
| 3 | Audit and build out scaffold-only pages (remove TODOs/placeholders) | 4 | 2 | 8 | QA audit |
| 4 | Skeleton loaders audit — replace any remaining spinners in MapPage/ParcelDetailPage | 4 | 2 | 8 | QA audit |
| 5 | Live Lantmäteriet API integration (fastighets-ID real lookup) | 5 | 3 | ~8 | Build |
| 6 | Live Sentinel Hub API integration (replace demo satellite data with live data) | 5 | 3 | ~8 | Build |
| 7 | Stripe billing flow completion (payment → subscription activation) | 4 | 2 | 8 | Build |
| 8 | SMS/push notification when beetle risk level changes | 4 | 2 | 8 | Retention |
| 9 | Weekly email digest automation (triggered from PostHog/Supabase) | 4 | 2 | 8 | Retention |
| 10 | WCAG AA audit on all interactive elements — fix any failures | 4 | 2 | 8 | Accessibility |

---

## Notes on Top 3

### 1. EFI ForestWard Observatory Pipeline
The `ForestWardObservatoryPage.tsx` already exists. The grant (G-01-2026) requires Copernicus data integration, biodiversity assessment, fire risk, and carbon tracking — all of which BeetleSense has or is building. Completing the data contribution pipeline would make BeetleSense an official EFI partner, creating institutional credibility no competitor has.

### 2. RLS on All Tables
Security baseline. Every table that stores user data must have row-level security enabled. Failing this is a launch blocker. Takes a day in the Supabase dashboard.

### 3. Scaffold Page Audit
100+ pages is impressive, but some will have placeholder content. Shipping placeholder content to production users damages trust. Run: `grep -r "TODO\|Coming soon\|placeholder" apps/web/src/pages/owner/` and triage.

---

## Incoming Items (from Monitor loop)
*Add items here as they surface from weekly analytics/error/feedback reports.*
