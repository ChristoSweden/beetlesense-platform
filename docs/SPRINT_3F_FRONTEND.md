# Sprint 3-Frontend: PWA Features

**Duration:** 2 weeks
**Goal:** Deliver the core interactive experience — map dashboard, smartphone capture, survey management, AI companion, push notifications, and offline mode.

---

## 3F-01: MapLibre GL Interactive Map Dashboard
**Role:** Frontend Engineer | **Estimate:** 5 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 01a | Initialize MapLibre GL with BeetleSense dark-green basemap (`--bg: #030d05`, `--green: #4ade80`) | Map renders full-screen in `/owner/dashboard`; `DM Sans`/`DM Mono` fonts; controls styled with design tokens |
| 01b | Parcel boundary layer (GeoJSON polygons) | Parcels render with `--green-dim` fill 30% opacity + `--green` stroke; click opens detail panel (name, area, last survey); loads from Supabase `parcels` via RPC |
| 01c | Module result overlay system | GeoJSON/raster overlays per module; layer switcher (bottom-left, collapsible) with toggles; distinct color ramps per module type |
| 01d | Satellite imagery layer | Toggle between styled vector map and satellite; smooth opacity fade (300ms) |
| 01e | Swedish open data toggleable layers | Skogsstyrelsen WMS layers: forest stands, protected areas, beetle damage; info tooltips per layer |
| 01f | Cluster / individual tree view | Zoom < 14: cluster badges; zoom >= 14: individual markers; click shows species, DBH, health; smooth animation |
| 01g | Map state (Zustand `useMapStore`) | Active parcel, visible layers, selected feature, viewport; persists to `localStorage` |

---

## 3F-02: Smartphone Capture Flow
**Role:** Frontend Engineer + Designer | **Estimate:** 4 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 02a | Camera viewfinder with guided framing | Full-screen camera via MediaDevices API; overlay grid + instructional text; configurable prompt sequence; iOS Safari 16+ and Chrome 100+ |
| 02b | Quality gate: blur detection | Laplacian variance check; warning if < threshold; accept or retake option; score stored in metadata |
| 02c | Quality gate: resolution + lighting | Min 1920x1080; luminance check on center crop; checks < 500ms |
| 02d | GPS tagging | Coordinates from Geolocation API; warn if accuracy > 20m; fallback manual entry |
| 02e | Batch upload with progress | Thumbnail strip; per-file progress bar; success toast |
| 02f | Offline upload queue | IndexedDB `pendingUploads`; badge shows count; auto-resume on reconnect; max 3 retries |

---

## 3F-03: Survey Management UI
**Role:** Frontend Engineer | **Estimate:** 3 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 03a | Create survey wizard | 3-step: select parcel → select modules → review/confirm; inserts to Supabase |
| 03b | Survey list view | Table/card list; status badges (Draft/Uploading/Processing/Complete/Failed); sorted by date |
| 03c | Survey detail with real-time status | Per-module progress cards; Supabase Realtime subscription; animated status transitions |
| 03d | Processing status toast notifications | Bottom-right toasts on status change; green/amber/red; auto-dismiss 5s |

---

## 3F-04: AI Companion Chat Interface
**Role:** Frontend Engineer + Designer | **Estimate:** 4 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 04a | Chat panel layout (responsive) | Desktop: 400px right sidebar; Mobile: full-screen overlay; `--bg2` background; `Cormorant Garamond` header |
| 04b | Streaming message display | Token-by-token SSE streaming; typing indicator; Markdown rendering; `DM Mono` code blocks |
| 04c | Source citations (expandable) | `[1]`, `[2]` markers; click expands inline card with title, excerpt, link; `--border2` styled |
| 04d | "Ask about this" context button | Sparkle icon on map features/charts; pre-fills chat with context; opens panel if closed |
| 04e | Voice input | SpeechRecognition API; pulsing mic button; real-time transcript; 10s silence timeout; graceful fallback |
| 04f | Chat history persistence | Zustand + `localStorage` (last 100 messages); scroll to latest; clear with confirmation |

---

## 3F-05: Push Notifications
**Role:** Frontend Engineer | **Estimate:** 2 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 05a | Service worker push registration | Custom prompt modal; VAPID subscribe; store to Supabase `push_subscriptions`; handle denied |
| 05b | Notification display + click handling | Parse payload JSON; native notification with icon; click opens app at URL |
| 05c | Job completion alerts | "Survey Complete: [Module] results ready for [Parcel]"; in-app toast if foreground |

---

## 3F-06: Offline Mode
**Role:** Frontend Engineer | **Estimate:** 3 days

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 06a | Workbox caching strategy | Precache shell; StaleWhileRevalidate API (24h); CacheFirst images (200 items, 7d); < 100MB quota |
| 06b | Offline map tile caching | Cache parcel bbox tiles at zoom 10-16; max 500 tiles/parcel; offline indicator badge |
| 06c | Offline indicator + sync | Amber banner; `useNetworkStore`; auto-sync pending mutations on reconnect; progress indicator |
| 06d | Cached project data | Parcel/survey lists offline; "Last updated" timestamp label; disabled features show "Requires connection" |

---

## Dependency Graph
```
06a (Workbox) ── must be first for all offline tasks
01a (Map init) → 01b-01f
01g (Zustand map) → 01b, 01c, 01f, 04d
02a (Camera) → 02b, 02c, 02d
02e (Upload) → 02f (offline queue)
03a (Survey wizard) → 03c (detail)
03c (Realtime) → 03d (toasts), 05c (push)
04a (Chat layout) → 04b-04f
05a (Push reg) → 05b, 05c
```

## Definition of Done
- Responsive at 360px, 768px, 1440px
- All text in `t()` with EN keys; SV stubs
- Lighthouse PWA >= 90
- Zustand stores unit tested (Vitest)
- Camera tested on physical Android + iOS
- No console errors; TypeScript strict mode clean
