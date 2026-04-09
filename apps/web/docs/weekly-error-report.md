# BeetleSense — Weekly Error Report Template

*Run every Monday. Pull from Sentry + Supabase error_logs. Takes ~10 minutes.*

---

## Week of: [DATE]

---

## New Errors This Week

| Error Code | Module | Count | Severity | First Seen | Last Seen |
|---|---|---|---|---|---|
| | | | | | |

---

## Errors Exceeding Threshold (>10 occurrences)

*(Any error appearing more than 10 times requires investigation before next release)*

| Error Code | Count | Root Cause | Fix Status |
|---|---|---|---|
| | | | |

---

## Error Breakdown by Module

| Module | Error Count | Top Error Code |
|---|---|---|
| AUTH | | |
| DB | | |
| API | | |
| UI | | |
| MAP | | |
| PARCEL | | |
| SURVEY | | |
| COMPANION | | |
| UPLOAD | | |
| REPORT | | |
| FEED | | |
| ADMIN | | |

---

## Sentry Triage Notes

**Critical (P0 — fix immediately)**:

**High (P1 — fix this week)**:

**Medium (P2 — schedule)**:

**Low (P3 — backlog)**:

---

## Supabase error_logs Check

- [ ] error_logs table checked for entries not appearing in Sentry (offline/no-init captures)
- [ ] Any AUTH-004 (unauthorized) spikes suggesting RLS issues?
- [ ] Any PARCEL-002/005 spikes suggesting external API issues?

---

## Top Finding This Week

*(1–2 sentences: the most impactful error pattern)*

---

## Recommended Fix

*(1 concrete action: the highest-priority fix based on frequency × severity)*
