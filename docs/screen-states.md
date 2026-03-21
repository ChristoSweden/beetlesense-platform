# Screen States Reference

> Every major screen in BeetleSense.ai with all UI states defined.
> Designed mobile-first for 375px devices; thumb-reach verified.

---

## Table of Contents

1. [State Definitions](#state-definitions)
2. [Error State Template](#error-state-template)
3. [Empty State Template](#empty-state-template)
4. [Onboarding Flow (First Win < 2 min)](#onboarding-flow)
5. [Screen Catalog](#screen-catalog)
   - [Landing Page](#1-landing-page)
   - [Login / Signup](#2-login--signup)
   - [Onboarding](#3-onboarding)
   - [Dashboard](#4-dashboard)
   - [Parcel List](#5-parcel-list)
   - [Parcel Detail](#6-parcel-detail)
   - [Survey List](#7-survey-list)
   - [Survey Detail](#8-survey-detail)
   - [Map View](#9-map-view)
   - [AI Companion](#10-ai-companion)
   - [Capture (Camera)](#11-capture-camera)
   - [Reports](#12-reports)
   - [Settings](#13-settings)
   - [Admin Dashboard](#14-admin-dashboard)
   - [Feedback Widget](#15-feedback-widget)
6. [Thumb Reach Notes (375px)](#thumb-reach-notes)

---

## State Definitions

Every screen implements these five states:

| State       | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| **Default** | Normal rendered state with real data visible.                               |
| **Loading** | Skeleton/shimmer placeholders matching the default layout shape.            |
| **Empty**   | No data exists yet. Uses the empty state template (icon + headline + CTA).  |
| **Error**   | Something failed. Uses the error state template (message + code + action).  |
| **Success** | A mutation completed. Confirmation toast or inline confirmation.            |

---

## Error State Template

All error states follow the same structure so users never feel lost:

```
┌──────────────────────────────────┐
│         [Error Icon]             │
│                                  │
│   Human-readable message         │
│   "Vi kunde inte ladda dina      │
│    skiften just nu."             │
│                                  │
│   Error code: E-PARCEL-LOAD-500 │
│                                  │
│   [  Forsok igen  ]   (primary) │
│   [  Kontakta oss ]   (ghost)   │
└──────────────────────────────────┘
```

### Rules
- **Human message**: one plain sentence in Swedish (with i18next fallback to English). Never expose raw API errors.
- **Error code**: structured as `E-{DOMAIN}-{ACTION}-{HTTP_STATUS}`. Examples:
  - `E-AUTH-LOGIN-401` — wrong credentials
  - `E-SURVEY-UPLOAD-413` — file too large
  - `E-MAP-TILES-503` — tile server unavailable
  - `E-COMPANION-STREAM-429` — AI rate limited
- **Next action**: always at least one button. Primary = retry the failed action. Secondary = link to support or alternative path.
- Error codes are logged to PostHog as `error.displayed` with properties `{code, screen, user_id}`.

### Error Code Catalog (key codes)

| Code                     | Message (sv)                                               | Primary Action    |
|--------------------------|------------------------------------------------------------|-------------------|
| `E-AUTH-LOGIN-401`       | Fel e-post eller losenord.                                 | Forsok igen       |
| `E-AUTH-SIGNUP-409`      | Det finns redan ett konto med den e-posten.                | Logga in istallet |
| `E-PARCEL-LOAD-500`     | Vi kunde inte ladda dina skiften just nu.                  | Forsok igen       |
| `E-PARCEL-CREATE-400`   | Granserna kunde inte tolkas. Kontrollera filen.            | Valj ny fil       |
| `E-SURVEY-UPLOAD-413`   | Filen ar for stor (max 2 GB).                              | Valj mindre fil   |
| `E-SURVEY-PROCESS-500`  | Analysen misslyckades. Vi undersöker.                      | Forsok igen       |
| `E-MAP-TILES-503`       | Kartan gar inte att ladda just nu.                         | Forsok igen       |
| `E-COMPANION-STREAM-429`| AI-assistenten ar overbelastad. Vanligen vanta en stund.   | Forsok igen       |
| `E-COMPANION-STREAM-500`| Nagot gick fel med AI-svaret.                              | Forsok igen       |
| `E-CAPTURE-CAMERA-NA`   | Vi kunde inte komma at kameran. Kontrollera behörigheter.  | Oppna installningar|
| `E-REPORT-GEN-500`      | Rapporten kunde inte skapas.                               | Forsok igen       |
| `E-NETWORK-OFFLINE`     | Du ar offline. Anslut till internet och forsok igen.       | Forsok igen       |

---

## Empty State Template

All empty states follow this structure to guide users to their first action:

```
┌──────────────────────────────────┐
│         [Illustration/Icon]      │
│                                  │
│   Headline                       │
│   "Inga skiften annu"           │
│                                  │
│   Description (1-2 sentences)    │
│   "Lagg till ditt forsta skifte  │
│    for att borja overvaka din    │
│    skog med AI."                 │
│                                  │
│   [ + Lagg till skifte ] (CTA)  │
└──────────────────────────────────┘
```

### Rules
- **Icon**: contextual SVG from the BeetleSense icon set (tree, drone, magnifying glass, chat bubble, etc.).
- **Headline**: short, in Swedish. States what is missing, not what went wrong.
- **Description**: 1-2 sentences explaining the value of adding data. Never blame the user.
- **CTA**: one prominent button that takes them directly to the creation flow.
- Empty states should feel inviting, not empty. Use soft green tones from the design system.

---

## Onboarding Flow

**Goal: first "win" in under 2 minutes.**

The win = seeing your first parcel on the map with a health summary from satellite data.

### Flow Steps (timed)

| Step | Screen              | Time Target | What Happens                                                              |
|------|---------------------|-------------|---------------------------------------------------------------------------|
| 1    | Signup              | 0:00-0:20   | Email + password (or Google/BankID). Role selector: owner/pilot/inspector |
| 2    | Welcome             | 0:20-0:30   | "Valkomna, Erik!" + 3-dot progress indicator. Language picker (sv/en)     |
| 3    | Add First Parcel    | 0:30-1:20   | Search by fastighetsbeteckning OR drop a pin on the map. Auto-fetch boundary from Lantmateriet. Name the parcel. |
| 4    | Satellite Snapshot  | 1:20-1:40   | Auto-trigger satellite health check (Sentinel-2 latest). Show NDVI card while processing (skeleton -> result). |
| 5    | First Win           | 1:40-2:00   | Dashboard with parcel card showing: map thumbnail, area (ha), latest NDVI, one AI insight ("Din skog ser frisk ut!"). Confetti animation. |

### Skip / Defer

- Users can skip parcel creation (goes to empty dashboard with prominent "Add Parcel" CTA).
- Pilot role skips to pilot profile setup (drone model, certifications).
- Inspector role skips to client list setup.

### Onboarding Completion Criteria

The `profiles.onboarded` flag is set to `true` when:
- Owner: has at least one parcel created
- Pilot: has completed pilot profile with at least one drone model
- Inspector: has completed inspector settings

---

## Screen Catalog

---

### 1. Landing Page

**Route**: `/`
**File**: `apps/web/src/pages/LandingPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Hero section with animated forest canopy, value props, pricing cards (Gratis / Pro / Enterprise), testimonials carousel, CTA buttons ("Borja gratis" / "Boka demo"). Footer with legal links. |
| Loading  | Full-page skeleton: hero image placeholder, 3 shimmer cards for pricing, shimmer text blocks. Loads fast because it is pre-rendered. |
| Empty    | N/A — landing page always has content. |
| Error    | If CMS content fails to load: show static fallback content baked into the bundle. Toast: "Visst innehall kunde inte laddas." |
| Success  | N/A — no mutations on this page. |

**Thumb reach**: CTA buttons in bottom 60% of viewport. Hamburger menu top-right. Scroll-to-section nav fixed at bottom on mobile.

---

### 2. Login / Signup

**Route**: `/login`, `/signup`
**File**: `apps/web/src/components/auth/AuthCallback.tsx` (callback handler)

| State    | Description |
|----------|-------------|
| Default  | Centered card with email + password fields, "Logga in" button, "Skapa konto" toggle, social login buttons (Google), "Glomt losenord?" link. BeetleSense logo above. |
| Loading  | Button shows spinner. Form inputs disabled. Progress indicator below button. |
| Empty    | N/A — form is always rendered. |
| Error    | Inline error below the relevant field (red text). General errors in a toast. Codes: `E-AUTH-LOGIN-401`, `E-AUTH-SIGNUP-409`, `E-AUTH-SIGNUP-422` (validation). |
| Success  | Login: redirect to `/dashboard` (or onboarding if `!profile.onboarded`). Signup: redirect to onboarding step 2. Toast: "Valkomna!" |

**Thumb reach**: Form centered vertically. Submit button in comfortable thumb zone. Social login buttons below primary form. Password visibility toggle on right edge of input.

---

### 3. Onboarding

**Route**: `/onboarding`
**File**: `apps/web/src/pages/OnboardingPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Multi-step wizard (3-5 steps depending on role). Progress dots at top. Each step: headline, description, input or map interaction, "Nasta" button. |
| Loading  | Step content skeleton. When fetching Lantmateriet boundary: map shows pulse animation around the search area. "Hamtar granserna..." text. |
| Empty    | N/A — onboarding always has a form to fill. |
| Error    | Inline per-step errors. If boundary fetch fails: "Vi kunde inte hitta den fastigheten. Forsok med en annan beteckning eller rita granserna manuellt." Code: `E-PARCEL-CREATE-400`. |
| Success  | Final step: confetti + "Du ar redo!" message. Auto-redirect to dashboard after 2 seconds. |

**Thumb reach**: "Nasta" / "Tillbaka" buttons anchored to bottom of screen (sticky). Input fields in scrollable area above buttons. Map interaction area fills middle 60% of screen.

---

### 4. Dashboard

**Route**: `/dashboard`
**File**: `apps/web/src/pages/owner/DashboardPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Greeting card ("God morgon, Erik"), weather widget, parcel summary cards (2-3 visible, horizontal scroll), active survey status, recent alerts (3 max), AI companion quick-ask bar, quick actions grid (New Survey, Capture Photo, View Map, AI Companion). |
| Loading  | Greeting with name (from auth cache). Skeleton cards for parcels (3 shimmer rectangles). Skeleton for weather. Skeleton for alerts list. |
| Empty    | If no parcels: full-width empty state card. Icon: tree with plus. Headline: "Din skog vantar." Description: "Lagg till ditt forsta skifte for att borja overvaka skogen med AI." CTA: "+ Lagg till skifte". |
| Error    | Individual widget errors (parcel card shows retry icon, weather shows "—", alerts show retry). Dashboard frame always renders. Code: `E-PARCEL-LOAD-500`. |
| Success  | After creating a parcel: card appears with slide-in animation. Toast: "Skifte tillagt!" |

**Thumb reach**: Quick action grid in bottom half. Companion quick-ask bar above bottom nav. Parcel cards scrollable horizontally with left thumb. Bottom nav: Home, Map, Capture (center FAB), AI, Settings.

---

### 5. Parcel List

**Route**: `/parcels`
**File**: `apps/web/src/pages/owner/ParcelsPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | List of parcel cards with: name, area (ha), municipality, last survey date, NDVI health indicator (green/yellow/red dot), thumbnail map. Sort/filter bar at top (by name, area, health). Search input. |
| Loading  | 4 skeleton cards stacked vertically. Search bar rendered but disabled. |
| Empty    | Icon: forest outline. Headline: "Inga skiften annu." Description: "Lagg till dina fastigheter for att borja overvaka med satellitdata och AI." CTA: "+ Lagg till skifte". |
| Error    | Error template: "Vi kunde inte ladda dina skiften." Code: `E-PARCEL-LOAD-500`. Retry button. |
| Success  | After creating/deleting: list updates with animation. Toast confirmation. |

**Thumb reach**: Search bar at top (reachable with stretch or pull-down gesture). Parcel cards are tap targets > 48px tall. FAB "+ Lagg till" anchored bottom-right above nav.

---

### 6. Parcel Detail

**Route**: `/parcels/:id`
**File**: `apps/web/src/pages/owner/ParcelDetailPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Header: parcel name + area badge. Map preview (boundary highlighted). Tabs: Oversikt (overview), Analyser (analysis results), Historik (archive timeline), Dokument (vault), Anteckningar (notes). Overview tab: NDVI trend chart, latest survey card, alerts for this parcel, weather at parcel location, open data layers toggle. |
| Loading  | Map placeholder (grey rectangle with boundary outline shimmer). Tab content skeleton: 3 cards with shimmer lines. Chart area: shimmer rectangle. |
| Empty    | Overview with map but no survey data: "Ingen analys annu. Bestall en droneflygning eller ladda upp bilder for att komma igang." CTA: "Bestall droneflygning" / "Ladda upp bilder". Archive tab empty: "Ingen historik registrerad annu. Borja dokumentera din skogs historia." CTA: "+ Lagg till handelse". |
| Error    | If parcel load fails: full error template. If individual tab fails: tab-level error with retry. Code: `E-PARCEL-LOAD-500`. |
| Success  | After ordering a survey: status badge appears on parcel card. Toast: "Flygning beställd!" |

**Thumb reach**: Tabs scrollable horizontally in thumb zone. Map is view-only (tap opens full Map View). Action buttons anchored at bottom. Scroll content in middle.

---

### 7. Survey List

**Route**: `/surveys`
**File**: `apps/web/src/pages/owner/SurveysPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | List of survey cards showing: parcel name, date, status badge (color-coded: draft=grey, processing=amber, complete=green, failed=red), modules requested (icon chips), pilot name (if assigned). Filter bar: by status, by parcel. |
| Loading  | 3 skeleton cards with status badge placeholder, shimmer text lines. Filter bar rendered. |
| Empty    | Icon: drone silhouette. Headline: "Inga undersokningar annu." Description: "Bestall din forsta droneflygning eller ladda upp bilder fran skogen." CTA: "+ Ny undersokning". |
| Error    | Error template. Code: `E-SURVEY-LOAD-500`. |
| Success  | After creating survey: card slides in at top of list. Toast: "Undersokning skapad!" |

**Thumb reach**: Filter chips in horizontal scroll, thumb-friendly. Survey cards are full-width tap targets. "Ny undersokning" FAB bottom-right.

---

### 8. Survey Detail

**Route**: `/surveys/:id`
**File**: `apps/web/src/pages/owner/SurveyDetailPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Status tracker at top (horizontal stepper: draft -> requested -> assigned -> flying -> uploading -> processing -> review -> complete). Parcel map with flight path overlay. Module results section: cards per module (tree count, species ID, beetle detection, etc.) each with confidence badge. Upload list with file cards. Report generation button (if complete). |
| Loading  | Status tracker shows current step highlighted, rest shimmer. Module cards: shimmer with icon placeholder. Map: grey with boundary outline. |
| Empty    | Survey in draft status: "Den har undersokningen har inte borjat annu." CTA: "Skicka forfragan" (submit request). No uploads yet: "Inga filer uppladdade. Piloten har inte borjat flygningen annu." |
| Error    | If processing failed: red status badge on stepper. Error detail card with processing log summary. Code: `E-SURVEY-PROCESS-500`. CTA: "Kontakta support" / "Forsok igen". |
| Success  | When survey completes: confetti on stepper. Module cards animate in with results. Toast: "Analysen ar klar!" |

**Thumb reach**: Status tracker scrollable horizontally. Module result cards in main scroll area. Action buttons (generate report, share) anchored bottom.

---

### 9. Map View

**Route**: `/map`
**File**: `apps/web/src/pages/owner/MapPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Full-screen MapLibre GL map. Parcel boundaries as GeoJSON polygons (fill + stroke). Layer toggle panel (slide-up drawer): satellite imagery, NDVI overlay, beetle risk heatmap, open data layers (Skogsstyrelsen, SGU soil). Parcel labels. Tap parcel -> bottom sheet with parcel summary + "Visa detaljer" link. |
| Loading  | Map tiles loading: standard MapLibre tile loading indicator. Parcel boundaries: pulsing outline while GeoJSON loads. Layer data: spinner on layer toggle chip. |
| Empty    | Map renders (centered on Sweden, zoom 5). No boundaries shown. Bottom sheet: "Lagg till ett skifte for att se det pa kartan." CTA: "+ Lagg till skifte". |
| Error    | If tile server fails: grey map with error overlay. Code: `E-MAP-TILES-503`. "Kartan gar inte att ladda. Forsok igen." If GeoJSON fails: map renders but no parcels. Toast: "Kunde inte ladda skiftesgranser." |
| Success  | After adding a parcel: map flies to the new parcel and highlights it with a pulse animation. |

**Thumb reach**: Layer toggle button bottom-left (thumb-friendly). Zoom +/- buttons on right edge, vertically centered. GPS "locate me" button bottom-right above nav. Parcel bottom sheet pulls up from bottom (natural thumb gesture). Map interaction is full-screen.

---

### 10. AI Companion

**Route**: `/companion`
**File**: `apps/web/src/components/companion/ChatMessage.tsx`, `CitationCard.tsx`

| State    | Description |
|----------|-------------|
| Default  | Chat interface. Session list in side drawer (slide from left). Active chat: message bubbles (user = right/dark green, assistant = left/light). Citation cards inline with source links. Quick-suggestion chips above input ("Hur mar min skog?", "Beetle risk i Smaland?", "Forklara NDVI"). Input bar with send button + optional parcel context selector. |
| Loading  | When waiting for AI response: typing indicator (three pulsing dots in assistant bubble). Streaming response renders word-by-word. Citation cards appear after message completes. |
| Empty    | No conversation history: centered welcome message. "Hej! Jag ar din skogsradgivare. Stall en fraga om din skog sa hjalper jag dig." Three suggestion chips below. Icon: friendly tree character. |
| Error    | If streaming fails mid-message: partial message with error indicator. "Nagot gick fel. Forsok igen." Code: `E-COMPANION-STREAM-500`. If rate limited: "Jag behover en liten paus. Forsok igen om en stund." Code: `E-COMPANION-STREAM-429`. Retry button on the failed message. |
| Success  | Message sent: message appears instantly (optimistic). Response streams in. Citation cards slide in. User can tap citations to open source. |

**Thumb reach**: Input bar fixed at bottom (above keyboard when focused). Send button right side of input. Suggestion chips just above input bar. Message scroll area fills rest of screen. Session drawer accessible via hamburger top-left or swipe-right.

---

### 11. Capture (Camera)

**Route**: `/capture`
**File**: `apps/web/src/pages/owner/CapturePage.tsx`
**Components**: `apps/web/src/components/capture/useCamera.ts`, `QualityGate.tsx`, `CaptureGallery.tsx`

| State    | Description |
|----------|-------------|
| Default  | Camera viewfinder (full screen). Capture button (large circle, bottom center). Gallery preview (bottom-left thumbnail). Flash toggle (top-right). Quality guidance overlay: "Hoja telefonen till ogonhojd" or "Fanga hela tradet". Active survey context badge (top-left). GPS coordinates display. |
| Loading  | Camera initializing: black screen with spinner. "Startar kameran..." After capture: processing overlay with progress ring (quality check). |
| Empty    | No photos captured yet in this session: gallery thumbnail shows dashed border with camera icon. |
| Error    | Camera permission denied: full-screen error. Icon: camera with X. "Vi behover tillgang till kameran for att ta bilder." Code: `E-CAPTURE-CAMERA-NA`. CTA: "Oppna installningar". If quality gate fails: toast with reason ("Bilden ar for suddig. Forsok igen."). |
| Success  | After capture: brief green border flash on viewfinder. Gallery thumbnail updates. Quality badge: green checkmark. If offline: "Sparad lokalt. Laddas upp nar du ar online igen." |

**Thumb reach**: Capture button dead center bottom (primary thumb target, 72px diameter). Gallery and flash in corners. Quality guidance in top half (read-only). Swipe up from capture button reveals gallery.

---

### 12. Reports

**Route**: `/reports`
**File**: `apps/web/src/pages/owner/ReportsPage.tsx`, `ReportPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | List: report cards with title, type badge (Standard / Inspektion / Forsakring), parcel name, date, status (draft/generated/shared). Detail: PDF preview, share button, download button, inspector name (if applicable). |
| Loading  | List: 3 skeleton cards. Detail: PDF preview area shimmer. Report generation: progress bar with status text ("Genererar rapport... Steg 2/4"). |
| Empty    | Icon: document with magnifying glass. Headline: "Inga rapporter annu." Description: "Rapporter skapas automatiskt nar en undersokning ar klar. Du kan aven skapa anpassade rapporter." CTA: "Visa undersokningar". |
| Error    | Report generation failed: card with error state. Code: `E-REPORT-GEN-500`. "Rapporten kunde inte skapas. Vi forsöker igen automatiskt." Retry button. |
| Success  | Report generated: card status flips to "Klar" with green badge. Toast: "Rapport klar! Ladda ner eller dela." |

**Thumb reach**: Report cards are full-width tap targets. Download/share buttons in bottom action bar on detail view. PDF preview scrollable in main area.

---

### 13. Settings

**Route**: `/settings`
**File**: `apps/web/src/pages/owner/SettingsPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | Sections: Profil (name, email, avatar, phone), Sprak (sv/en toggle), Notifikationer (toggles for each notification type), Prenumeration (current plan, upgrade CTA), Integritet (data export, delete account), Hjalp (support link, version number). |
| Loading  | Profile section skeleton. Notification toggles shimmer. Plan card shimmer. |
| Empty    | N/A — settings always have content. Some sections may show "Not configured" with setup CTAs. |
| Error    | If profile save fails: inline error on the field. Toast: "Andringarna kunde inte sparas." Code: `E-SETTINGS-SAVE-500`. |
| Success  | After saving: field briefly highlights green. Toast: "Sparad!" |

**Thumb reach**: All toggles and buttons in scrollable list, well within thumb reach. "Spara" button sticky at bottom when changes are pending. Destructive actions (delete account) require scroll to bottom + confirmation dialog.

---

### 14. Admin Dashboard

**Route**: `/admin`
**File**: `apps/web/src/pages/admin/AdminDashboardPage.tsx`

| State    | Description |
|----------|-------------|
| Default  | KPI cards row: total users, active surveys (this week), processing queue depth, error rate (24h), revenue MRR. User table with search/filter. System health indicators (Supabase, Redis, inference server, QGIS). Recent admin activity log. Quick actions: manage users, view error logs, moderate community. |
| Loading  | KPI cards: 5 shimmer rectangles. User table: shimmer rows. Health indicators: grey dots (unknown). |
| Empty    | Freshly deployed system: KPI cards show zeros. User table empty. "Inga anvandare har registrerat sig annu." |
| Error    | Individual widget errors. If admin API fails: full error template. Code: `E-ADMIN-LOAD-500`. Health indicator turns red for failed services. |
| Success  | After admin action (ban user, approve pilot, etc.): inline confirmation. Toast: "Andring sparad." Audit log updates in real-time via Supabase realtime. |

**Thumb reach**: This is primarily a desktop screen. On mobile: KPI cards in 2x2 grid with horizontal scroll for 5th. User table becomes stacked cards. Action buttons in each card's kebab menu (top-right of card).

---

### 15. Feedback Widget

**Component**: floating widget on all authenticated screens (bottom-right, above nav on mobile)

| State    | Description |
|----------|-------------|
| Default  | Small floating button with speech bubble icon. Tap opens slide-up sheet: rating selector (1-5 stars or emoji scale), category dropdown (Bug, Feature Request, Praise, Other), free text field (optional), screenshot toggle, "Skicka" button. |
| Loading  | After submit: button shows spinner. "Skickar feedback..." |
| Empty    | N/A — widget is always a blank form when opened. |
| Error    | If submission fails: "Feedbacken kunde inte skickas. Forsok igen." Code: `E-FEEDBACK-SEND-500`. Form data preserved so user does not lose their input. |
| Success  | After submit: form collapses. Button shows green checkmark for 2 seconds. Toast: "Tack for din feedback!" Widget closes automatically. |

**Thumb reach**: Floating button positioned 16px from right edge, 72px above bottom nav. On tap, sheet slides up from bottom (natural thumb gesture). Send button at bottom of sheet. Star rating in comfortable horizontal tap zone.

---

## Thumb Reach Notes

All dimensions reference a 375px (iPhone SE/13 mini) viewport.

### Zones

```
┌─────────────────────────┐  0px
│   Hard to reach          │
│   (status bar, back btn) │
├─────────────────────────┤  ~120px
│   Comfortable stretch    │
│   (search bars, filters) │
├─────────────────────────┤  ~320px
│   Easy reach             │
│   (primary content,      │
│    action buttons)       │
├─────────────────────────┤  ~580px
│   Natural thumb zone     │
│   (bottom nav, FABs,     │
│    input bars, CTAs)     │
└─────────────────────────┘  667px
```

### Guidelines

1. **Primary CTAs** (submit, next, send) always in the natural thumb zone (bottom 150px).
2. **Bottom navigation** fixed at 56px height. Items: Home, Map, Capture (center FAB 56px diameter), AI, Settings.
3. **Floating action buttons** positioned 16px from edges, 72px above bottom nav.
4. **Tap targets** minimum 44x44px (Apple HIG) with 8px spacing.
5. **Swipe gestures**:
   - Swipe up from bottom: open drawer/sheet.
   - Swipe right from left edge: open side navigation (companion session list).
   - Swipe down on lists: pull-to-refresh.
6. **Input fields**: when keyboard is visible, content scrolls so the active field is in the top 40% of remaining viewport.
7. **Modal sheets**: always slide from bottom, never from sides on mobile.
8. **Capture button**: 72px diameter circle, centered, with 80px total hit area.
9. **Map controls**: zoom +/- on right edge at vertical center. Layer toggle bottom-left.
10. **Loading skeletons**: match the exact layout of the default state to prevent layout shift (CLS = 0).
