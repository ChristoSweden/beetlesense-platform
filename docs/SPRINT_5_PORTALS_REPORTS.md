# Sprint 5: Portals + Reports

**Duration:** 2 weeks
**Goal:** Deliver Drone Pilot and Forest Inspector portals, report viewing/generation, settings, and PWA install experience.

---

## 5-01: Drone Pilot Portal — Application Flow
**Role:** Frontend + Designer | **Estimate:** 3 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 01a | Pilot registration multi-step form | `/pilot/apply`; 4 steps: personal info → credentials (license, insurance) → equipment (drone, camera, RTK) → sample work (3-5 images); progress bar; `sessionStorage` persistence |
| 01b | Application review status page | `/pilot/application-status`; read-only cards; status badges (Submitted/Under Review/Approved/Rejected); auto-redirect on approval |
| 01c | File upload with validation | Supabase Storage; PDF/JPG/PNG max 10MB; drag-and-drop; progress bars; thumbnail previews |

---

## 5-02: Drone Pilot — Job Board and Operations
**Role:** Frontend | **Estimate:** 4 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 02a | Job board list + map view | `/pilot/jobs`; toggle list/map; filter by distance (25/50/100 km), date, module; Realtime new job pulse |
| 02b | Job detail and accept flow | `/pilot/jobs/:id`; parcel preview mini-map; capture requirements; "Accept Job" with confirmation; max 3 concurrent |
| 02c | Capture guidelines display | Expandable checklist (pre-flight, during, post-flight); all items checked before upload enabled |
| 02d | Drone data upload | Drag-and-drop orthomosaic (2GB), raw ZIP (5GB), flight log; chunked upload (5MB); triggers "Data Submitted" |
| 02e | Earnings dashboard | `/pilot/earnings`; summary cards (total, month, pending); earnings table; 6-month bar chart; SEK `sv-SE` formatting |

---

## 5-03: Drone Pilot Public Profile
**Role:** Frontend + Designer | **Estimate:** 1 day

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 03a | Public profile page | `/pilots/:slug` (public); name, photo, location, equipment, job count, rating, portfolio; "Edit Profile" button if own |

---

## 5-04: Forest Inspector Portal
**Role:** Frontend + Designer | **Estimate:** 3 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 04a | Inspector registration | `/inspector/register`; single form: name, company, cert number, specializations (multi-select), regions; instant activation |
| 04b | Inspector dashboard | `/inspector/dashboard`; summary cards; activity feed; quick-action buttons |
| 04c | Valuation report template builder | `/inspector/reports/new`; select client + parcel; pre-filled sections from survey data; rich-text edit; auto-save 30s; "Generate Report" triggers PDF |
| 04d | Client sharing flow | `/inspector/reports/:id`; "Share with Client" modal; email notification; shared reports visible to owner |

---

## 5-05: Report Viewer
**Role:** Frontend | **Estimate:** 2 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 05a | In-app PDF preview | `react-pdf` viewer; pagination + zoom controls; loading skeleton |
| 05b | Download + share | Download via signed URL (60-min); `navigator.share()` on mobile; clipboard fallback on desktop |
| 05c | Report list view | `/owner/reports`; card grid; title, inspector, parcel, date, status badge |

---

## 5-06: Report Generation Trigger
**Role:** Frontend | **Estimate:** 1 day

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 06a | Generate report button | On survey detail when all modules Complete; modal: report type + language; Realtime subscription for completion |

---

## 5-07: Settings Pages
**Role:** Frontend | **Estimate:** 2 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 07a | Language switcher | EN/SV toggle; `i18n.changeLanguage()`; persists to `localStorage` + Supabase; locale formatting updates |
| 07b | Notification preferences | Toggles per event type; debounced auto-save (500ms); info banner if push denied |
| 07c | Parcel management | List owned parcels; inline edit name; add parcel (name + draw-on-map or upload GeoJSON/Shapefile); delete with confirmation |

---

## 5-08: PWA Install Prompt
**Role:** Frontend + Designer | **Estimate:** 1.5 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 08a | Custom install prompt | Intercept `beforeinstallprompt`; show after 2nd visit or 30s; Install/Dismiss; re-show after 7 days |
| 08b | iOS Safari guidance | Modal with step-by-step instructions + illustration; once per session; "Don't show again" |
| 08c | Post-install onboarding | Welcome toast on first standalone launch |

---

## Dependency Graph
```
5-01a (Pilot reg) → 5-01b (status), 5-02a (job board)
5-02b (Job accept) → 5-02c (guidelines), 5-02d (upload)
5-04a (Inspector reg) → 5-04b (dashboard), 5-04c (report template)
5-04c (Template) → 5-04d (sharing)
5-05a (PDF viewer) → 5-05b (download), 5-06a (generate)
Sprint 3F-01 (Map) → 5-07c (parcel draw)
Sprint 3F-05 (Push) → 5-07b (notif prefs)
Sprint 3F-06 (Offline/SW) → 5-08a (install prompt)
```

## Definition of Done
- All portal routes protected by `RequireRole` guard
- All forms validated with inline errors
- All strings in `t()` with EN + SV translations complete
- File uploads tested on 3G throttle
- PDF viewer tested with 50+ page docs
- Responsive at 360px, 768px, 1440px
- ARIA labels on icon-only buttons; contrast >= 4.5:1
- E2E smoke: pilot reg → job board → accept; inspector reg → create report → share
