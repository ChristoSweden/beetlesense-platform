# BeetleSense — Weekly Analytics Report Template

*Run every Monday. Pull from PostHog. Takes ~15 minutes.*

---

## Week of: [DATE]

---

## KPI 1: Onboarding Completion Rate
**Target**: 60% of new signups register first parcel within 7 days

| Metric | This Week | Last Week | Target |
|---|---|---|---|
| New signups | | | — |
| Onboarding started | | | — |
| First parcel registered | | | — |
| Funnel completion rate | | | 60% |

**PostHog query**: Funnel → user_signed_up → parcel_registered → window: 7 days

**Status**: [ ] On track / [ ] Below target / [ ] Above target

**Drop-off point**: *(Which step loses the most users?)*

---

## KPI 2: Weekly Active Satellite Checks
**Target**: 40% of registered owners view satellite data at least once per week

| Metric | This Week | Last Week | Target |
|---|---|---|---|
| Registered forest owners (total) | | | — |
| Unique users: parcel_viewed (satellite) | | | — |
| WAU % | | | 40% |

**PostHog query**: Event → parcel_viewed with source=satellite → unique users this week / total registered owners

**Status**: [ ] On track / [ ] Below target / [ ] Above target

---

## KPI 3: Survey Completion Rate
**Target**: 70% of surveys reach results_viewed within 30 days

| Metric | This 30-day window | Previous window | Target |
|---|---|---|---|
| Surveys created | | | — |
| Surveys: results_viewed | | | — |
| Completion rate | | | 70% |

**PostHog query**: Funnel → survey_created → survey_results_viewed → 30-day window

**Status**: [ ] On track / [ ] Below target / [ ] Above target

---

## Engagement Health

| Event | Count This Week | vs Last Week |
|---|---|---|
| companion_message_sent | | |
| capture_completed | | |
| report_generated | | |
| feedback_submitted | | |
| error_occurred | | |

---

## Unexpected / Missing Events

*(Flag any event firing unexpectedly or not firing when expected)*

- [ ] All signup flows firing user_signed_up?
- [ ] onboarding_completed firing correctly?
- [ ] Any error_occurred spike?

---

## Top Finding This Week

*(1–2 sentences: the single most important thing the data shows)*

---

## Recommended Action

*(1 concrete change based on the data)*
