# BeetleSense.ai — Annotated PRD Cross-Reference

This document maps PRD v2.1 features against personas, flags complexity concerns, and links to the three KPIs.

---

## Feature-to-Persona Mapping

Each PRD feature is rated for relevance to each persona:
- **Primary** = core to their workflow, they would not use the platform without it
- **Useful** = adds value but is not the reason they signed up
- **Low** = rarely or never used by this persona

| PRD Feature | Erik (Forest Owner) | Anna (Drone Pilot) | Magnus (Inspector) | KPI Impact |
|---|---|---|---|---|
| **Magic link signup** | Primary | Primary | Primary | KPI 1 (TTFV) |
| **Role-based onboarding** | Primary | Primary | Primary | KPI 1 (TTFV) |
| **Parcel registration (fastighetsbeteckning)** | Primary | Low | Primary | KPI 1 (TTFV) |
| **Auto open data enrichment** | Primary | Low | Primary | KPI 1 (TTFV) |
| **Interactive map (MapLibre GL)** | Primary | Useful | Primary | KPI 2 (Survey Completion) |
| **Smartphone capture module** | Primary | Low | Low | KPI 2 (Survey Completion) |
| **Guided photo quality gate** | Primary | Low | Low | KPI 2 (Survey Completion) |
| **Survey ordering** | Primary | Low (receives, not orders) | Useful | KPI 2 (Survey Completion) |
| **Drone pilot job board** | Low | Primary | Low | KPI 2 (Survey Completion) |
| **Pilot credentials & verification** | Low | Primary | Low | KPI 2 (Survey Completion) |
| **Pilot earnings dashboard** | Low | Primary | Low | — |
| **Data upload (presigned URLs)** | Useful | Primary | Useful | KPI 2 (Survey Completion) |
| **Beetle damage detection (e-nose + CV)** | Primary | Low (captures data) | Useful | KPI 2, KPI 3 |
| **Tree count inventory** | Useful | Low | Primary | KPI 2 |
| **Species identification** | Useful | Low | Primary | KPI 2 |
| **Wild boar damage detection** | Useful | Low | Useful | KPI 2 |
| **Animal inventory** | Low | Low | Low | KPI 2 |
| **Module 6 [confidential]** | Unknown | Unknown | Unknown | — |
| **Multi-source data fusion engine** | Primary (invisible) | Low | Primary (invisible) | KPI 2, KPI 3 |
| **Satellite integration (Sentinel-2)** | Primary (invisible) | Low | Primary | KPI 1, KPI 2 |
| **LiDAR processing (Lantmäteriet)** | Primary (invisible) | Low | Primary | KPI 1 |
| **QGIS Server (WMS/WFS)** | Primary (invisible) | Low | Primary (invisible) | — |
| **AI Companion (RAG chat)** | Primary | Useful | Useful | KPI 3 (Engagement) |
| **AI Companion — scenario modelling** | Primary | Low | Useful | KPI 3 |
| **AI Companion — report interpretation** | Primary | Low | Primary | KPI 3 |
| **AI Companion — voice input** | Primary | Low | Low | KPI 3 |
| **PDF report generation** | Primary | Low | Primary | KPI 2 |
| **Inspector valuation template** | Low | Low | Primary | KPI 2 |
| **Client sharing modal (inspector)** | Low | Low | Primary | — |
| **Push notifications** | Primary | Primary | Useful | KPI 2, KPI 3 |
| **Offline mode (service worker)** | Primary | Useful | Low | KPI 1, KPI 2 |
| **PWA install prompt** | Primary | Useful | Low | — |
| **i18n (Swedish + English)** | Primary (SV) | Useful | Primary (SV) | KPI 1 |
| **German + Finnish (v2.1)** | Low | Low | Low | — |
| **Status tracker (survey progress)** | Primary | Primary | Useful | KPI 2 |
| **Research citation display** | Useful | Low | Primary | KPI 3 |
| **Settings & profile management** | Useful | Useful | Useful | — |
| **Billing & plan management** | Useful | Low | Useful | — |

---

## Complexity Flags

These PRD features add significant implementation complexity. For each, the question is: does the user value justify the engineering cost?

### Flag 1: Animal Inventory Module (Section 8.3)

**Complexity**: High — requires thermal/RGB drone imagery, YOLO fine-tuning on Nordic wildlife aerial datasets, habitat context integration from Copernicus.

**Persona value**: Low across all three personas. Erik does not buy BeetleSense to count moose. Anna does not get paid extra for animal data. Magnus does not include animal counts in valuations.

**Recommendation**: Defer to v1.2 or later. The same YOLO infrastructure is needed for tree count and beetle detection, so the marginal cost is lower than building from scratch — but the calibration, validation, and UX work is not trivial. Ship beetle detection and tree count first. Add animal inventory when a customer explicitly asks for it.

**Risk if deferred**: Minimal. No persona's primary job depends on this module.

---

### Flag 2: AI Companion Scenario Modelling (Section 9.4)

**Complexity**: Very high — requires probabilistic spread models, integration with EFI outbreak data, timber market price feeds, parcel topology analysis, and presentation of confidence ranges. This is research-grade modelling wrapped in a conversational interface.

**Persona value**: High for Erik (this is the dream feature — "what happens if I wait 30 days?") but extremely difficult to build accurately. An inaccurate scenario model is worse than no model — it creates false confidence.

**Recommendation**: Launch AI Companion without scenario modelling. Ship it as a retrieval + interpretation tool first (research citations, report explanation, general advice). Add scenario modelling in v1.1 only after validating the RAG quality on real users. When launched, mark all scenario outputs with prominent confidence ranges and "model estimate" labels.

**Risk if deferred**: Moderate. The PRD positions scenario modelling as a headline feature. Manage expectations by clearly labelling it as "coming soon" and ensuring the base Companion is compelling enough on its own.

---

### Flag 3: Voice Input for AI Companion (Section 9.6)

**Complexity**: Moderate — requires Web Speech API integration, Swedish language speech-to-text (which has lower accuracy than English), UI for recording state, and error handling for ambient noise in forest environments.

**Persona value**: High for Erik (who types slowly and is often in the forest), low for everyone else.

**Recommendation**: Include in v1.0 but as a progressive enhancement, not a blocking feature. Use the browser's native Web Speech API first. If Swedish recognition quality is poor, add a fallback to a cloud STT service (e.g., Google Cloud Speech-to-Text). Test in actual forest conditions with background noise.

**Risk if deferred**: Low-moderate. Erik can still type on his phone. But voice is a "delight" feature that reinforces the "expert on call in the forest" value proposition.

---

### Flag 4: German + Finnish Localisation (Section 11.4)

**Complexity**: Moderate — translation effort, right-to-left is not an issue, but forestry terminology in German and Finnish must be domain-accurate. Also requires adapting open data integrations (Finnish Metsäkeskus instead of Skogsstyrelsen, different property registries, different coordinate systems).

**Persona value**: Zero for current Swedish users. Future value depends on expansion plans.

**Recommendation**: Already correctly deferred to v2.1 in the PRD. Do not spend any time on this before Swedish launch. Ensure the i18next architecture supports easy addition of new languages (it does).

**Risk if deferred**: None for v1.0.

---

### Flag 5: Inspector Valuation Template (Skogsstyrelsen Guidelines)

**Complexity**: High — requires deep understanding of Swedish forest valuation standards, specific data field requirements, formatting rules, and legal compliance. The template must be accepted by banks, insurance companies, and courts.

**Persona value**: Primary for Magnus. This is the feature that determines whether inspectors adopt the platform. A template that is 90% correct is 100% useless — if any required field is missing, the inspector cannot use it.

**Recommendation**: Do not half-build this. Either commit to building it correctly with input from a practising forest inspector, or defer it entirely and let inspectors export raw data to their own templates. A broken valuation template will damage professional credibility.

**Risk if deferred**: High for inspector adoption. Magnus will not use the platform if he has to manually reformat every report.

---

### Flag 6: Pilot Earnings Dashboard (Section 13.1)

**Complexity**: Low-moderate — standard financial reporting (earnings per job, per month, pending payments, tax summary).

**Persona value**: High for Anna but only after the marketplace has volume. At launch with 5-10 jobs total, an earnings dashboard is premature.

**Recommendation**: Launch with a simple job history list showing completed jobs and amounts. Build the full earnings dashboard when pilots consistently complete 10+ jobs per month.

**Risk if deferred**: Low. Anna cares more about getting jobs than visualising earnings from jobs she has not done yet.

---

## KPI Alignment

### KPI 1: Time to First Value (TTFV) — Under 3 minutes

**Directly affected by**:
- Magic link signup speed (Auth infrastructure)
- Onboarding flow length (role + language + parcel — 3 screens)
- Fastighetsbeteckning autocomplete speed (Lantmäteriet API + caching)
- Open data enrichment latency (parallel fetches: LiDAR, KNN, Sentinel-2, property boundary)

**Features that slow TTFV down (watch for scope creep)**:
- Adding more onboarding steps (e.g., "tell us about your goals," "how did you hear about us")
- Requiring email verification before showing the dashboard (let them see data first, verify later)
- Forcing a tutorial or feature tour before showing the parcel

**Recommendation**: Every new feature touching signup or onboarding must be tested against TTFV. If a proposed change adds more than 15 seconds to the median, it needs strong justification.

---

### KPI 2: Survey Completion Rate — 95% or higher

**Directly affected by**:
- Pilot network density (geographic coverage)
- Upload pipeline reliability (presigned URLs, chunk upload, validation)
- Processing pipeline stability (BullMQ queue health, model inference success rate)
- SLA enforcement (24-hour standard, 4-hour priority)

**Features that risk lowering completion rate (watch carefully)**:
- Quality gate set too strictly on smartphone captures (rejecting usable images)
- Overly complex upload requirements for drone data (too many required file types)
- Module dependencies creating cascading failures (if Species ID fails, does the whole survey fail?)

**Recommendation**: Each module should be independently deliverable. If one module fails, deliver the rest and flag the failed module for retry. Never hold back 5 successful modules because 1 failed.

---

### KPI 3: AI Companion Engagement Rate — 60% or higher

**Directly affected by**:
- Companion discoverability (button placement, contextual prompts)
- Response quality (citations, personalisation, Swedish language quality)
- Response speed (< 5s first token)
- Value of the first response (must immediately demonstrate that the Companion knows the user's forest)

**Features that help engagement**:
- "Ask about this" contextual buttons on every map region, chart, and report section
- Proactive nudge after results delivery: "Want to know what your results mean? Ask the Forest Expert."
- Voice input (reduces friction for Erik in the field)

**Features that hurt engagement if done poorly**:
- Domain classifier set too aggressively (rejecting legitimate forestry questions)
- Generic responses that do not cite the user's own data (feels like a generic chatbot)
- Slow response time (> 8s kills the conversational feel)

**Recommendation**: The Companion's first response to any user's first question is the make-or-break moment. It must include at least one reference to the user's own parcel data. If Layer 3 is empty (no surveys yet), it should reference the open data already loaded for their parcel ("Based on the LiDAR data for Fårhult 3:7, your average tree height is 18 metres...").

---

## Summary of Prioritisation Recommendations

| Feature | PRD Priority | Recommended Priority | Reason |
|---|---|---|---|
| Beetle detection (e-nose + CV) | Core | Core | Flagship differentiator; drives all three KPIs |
| AI Companion (basic RAG) | Core | Core | Strategic differentiator; drives KPI 3 |
| Open data auto-enrichment | Core | Core | Drives KPI 1 (first win moment) |
| Tree count + species ID | Core | Core | Inspector adoption depends on these |
| Smartphone capture | Core | Core | Low-cost entry tier; broadens addressable market |
| Drone pilot job board | Core | Core | Enables service delivery; drives KPI 2 |
| PDF reports | Core | Core | Currency of the forestry business |
| Inspector valuation template | Core | Core (but build it properly or not at all) | Magnus will not adopt without it |
| Wild boar damage | Module | v1.0 (lower priority) | Useful but not primary driver for any persona |
| AI scenario modelling | Core | Defer to v1.1 | Too risky to ship inaccurate; base Companion is enough |
| Animal inventory | Module | Defer to v1.2 | Low value for all personas |
| Pilot earnings dashboard | Portal | Simplify for v1.0 | Not useful until marketplace has volume |
| Voice input | Companion | v1.0 (progressive enhancement) | High value for Erik; low risk with Web Speech API |
| DE + FI localisation | v2.1 | v2.1 (correct as planned) | No value for Swedish launch |
