# BeetleSense.ai — Key Performance Indicators

Exactly three KPIs. These are the numbers that determine whether the platform is working. Everything else is a supporting metric.

---

## KPI 1: Time to First Value (TTFV)

### What it measures
The elapsed time from a new user's first landing on the signup page to the moment they see meaningful data about THEIR forest. Specifically: from the first page load to the parcel registration confirmation screen showing the property boundary and at least one open data layer (LiDAR height, KNN species, or satellite imagery).

### Why it matters
This is the single most important predictor of user retention. If Erik (forest owner persona) does not see his own forest on the screen with real data within a few minutes, he will close the tab and never return. The "first win" — seeing your actual property boundary with satellite imagery and forest inventory data — is what converts a sceptical visitor into an engaged user. Every second of friction before that moment is a churn risk.

### How it is measured
- **Start event**: `page_load` on the signup/landing page (tracked via analytics)
- **End event**: `parcel_registered` event fires when the system confirms property boundary loaded and at least one open data layer rendered on the map
- **Tracked per user**: median and P90 across all new signups in the measurement period
- **Excluded**: users who abandon before completing signup (tracked separately as signup conversion rate)

### What success looks like
| Threshold | TTFV (median) | Status |
|---|---|---|
| Target | Under 3 minutes | On track |
| Acceptable | 3-5 minutes | Needs attention |
| Critical | Over 5 minutes | Blocking — investigate immediately |

### Breakdown targets
- Signup (magic link send + click): under 45 seconds
- Onboarding (3 screens): under 60 seconds
- Parcel lookup + boundary display: under 10 seconds
- Open data layer load: under 20 seconds (progressive, with skeleton placeholders)

### What to do when it is off track
- If signup is slow: check magic link delivery latency (Supabase Auth), simplify the signup form
- If onboarding is slow: reduce steps, remove optional fields, A/B test shorter flows
- If parcel lookup is slow: check Lantmäteriet API response time, add caching, pre-index common municipalities
- If open data load is slow: check satellite tile caching, parallelize data source fetches, show cached data first

---

## KPI 2: Survey Completion Rate

### What it measures
The percentage of ordered surveys that reach the "results delivered" state within the SLA window (24 hours for standard, 4 hours for priority). This measures end-to-end platform reliability — from order placement through pilot assignment, flight, data upload, processing, and result delivery.

### Why it matters
BeetleSense is a service business wrapped in a software platform. If a forest owner orders a beetle detection survey and results arrive late, incomplete, or not at all, trust is destroyed. This KPI captures every failure mode: no pilot available, pilot no-show, upload failure, processing error, SLA breach. A single failed survey in the early days can lose a customer permanently and generate negative word-of-mouth in the tight-knit Swedish forestry community.

### How it is measured
- **Numerator**: surveys where the `status` reaches `results_delivered` AND the delivery timestamp is within the SLA window for that survey's tier
- **Denominator**: all surveys with `status` past `order_confirmed` (i.e., customer has committed)
- **Measured**: rolling 30-day window
- **Broken down by**: module type, data collection method (drone pilot / self-upload / smartphone), region, pilot

### What success looks like
| Threshold | Completion rate (30-day) | Status |
|---|---|---|
| Target | 95% or higher | On track |
| Acceptable | 90-95% | Needs attention — identify failure patterns |
| Critical | Below 90% | Blocking — customer trust at risk |

### SLA compliance sub-metric
| Threshold | Within-SLA rate | Status |
|---|---|---|
| Target | 98% of completed surveys delivered within SLA | On track |
| Acceptable | 95-98% | Review processing pipeline bottlenecks |
| Critical | Below 95% | SLA breach rate too high — trigger incident review |

### What to do when it is off track
- If pilot assignment is the bottleneck: expand pilot network in that region, offer incentive bonuses, allow self-upload as fallback
- If processing fails: check error logs per module, add retry logic, alert on-call engineer
- If SLA is breached: auto-notify customer with explanation and credit, investigate root cause within 24 hours
- If smartphone surveys have lower completion: review quality gate rejection rates — may be too strict

---

## KPI 3: AI Companion Engagement Rate

### What it measures
The percentage of users with at least one delivered survey result who have at least one meaningful AI Companion conversation within 7 days of receiving results. A "meaningful conversation" is defined as: user sends at least 2 messages AND the Companion provides at least one response that includes a Layer 3 (customer data) citation.

### Why it matters
The AI Companion is the strategic differentiator — it is what makes BeetleSense a platform rather than a report delivery service. If users receive their results and never consult the Companion, the platform is functioning as an expensive drone survey broker, not an intelligence platform. Companion engagement signals that users trust the AI, find it useful, and are building a habit of data-informed forest management. It is also the stickiest feature: a user who talks to the Companion about their forest is far less likely to churn than one who just downloaded a PDF.

### How it is measured
- **Numerator**: users who received survey results in the period AND had at least one meaningful Companion conversation (2+ user messages, 1+ Layer 3 citation in response) within 7 days of result delivery
- **Denominator**: all users who received survey results in the period
- **Measured**: rolling 30-day window
- **Broken down by**: user role (owner / pilot / inspector), language (SV / EN), module type of the triggering survey

### What success looks like
| Threshold | Engagement rate (30-day) | Status |
|---|---|---|
| Target | 60% or higher | On track — Companion is becoming indispensable |
| Acceptable | 40-60% | Needs attention — improve discoverability and prompts |
| Critical | Below 40% | Strategic risk — Companion is not delivering value |

### Quality sub-metric
| Metric | Target |
|---|---|
| Companion answer quality (thumbs-up rate) | Above 85% |
| Responses with at least one citation | Above 95% |
| Average messages per conversation | Above 3 |
| P90 response latency (first token) | Under 5 seconds |

### What to do when it is off track
- If discoverability is the issue: make the "Ask the Forest Expert" button more prominent on results pages, add contextual prompts ("Want to know what this means? Ask the expert."), send a push notification suggesting a question after results delivery
- If quality is the issue: review low-rated responses, improve RAG retrieval, add more domain-specific training data, tune the system prompt
- If latency is the issue: optimise embedding lookup, reduce context window, cache frequent queries
- If users start but do not continue (1 message only): the first response is not compelling enough — review opening response quality, ensure Layer 3 data is being retrieved and cited
- If inspectors engage less than owners: tailor the Companion's persona for professional users (more technical language, legal references, valuation standards)

---

## Dashboard

These three KPIs should be displayed on an internal operations dashboard, updated hourly:

```
┌─────────────────────────────────────────────────────────┐
│  BeetleSense KPI Dashboard (rolling 30 days)            │
│                                                         │
│  TTFV (median)          2m 47s            ● GREEN       │
│  Survey Completion      96.2%             ● GREEN       │
│  Companion Engagement   54%               ● YELLOW      │
│                                                         │
│  [Click any KPI for breakdown by segment and trend]     │
└─────────────────────────────────────────────────────────┘
```

### Alert rules
- Any KPI enters "Critical" → PagerDuty alert to product lead + engineering lead
- Any KPI enters "Acceptable" for 3+ consecutive days → Slack notification to product channel
- Weekly email digest to all stakeholders with trend charts
