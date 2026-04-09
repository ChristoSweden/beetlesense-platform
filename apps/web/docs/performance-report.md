# BeetleSense — Performance Report (2026-04-08)

## Bundle Size: Before vs After

| Chunk | Before (raw) | Before (gzip) | After (raw) | After (gzip) | Notes |
|---|---|---|---|---|---|
| index.js (app shell) | 812 KB | 262 KB | 812 KB | 262 KB | unchanged (core shell) |
| vendor-maplibre | 803 KB | 218 KB | 803 KB | 218 KB | unavoidable |
| three.module / vendor-three | 507 KB | 128 KB | 527 KB | 132 KB | now named vendor-three |
| vendor-react | 362 KB | 117 KB | 362 KB | 117 KB | unchanged |
| data-static (new) | — | — | 252 KB | 69 KB | merged from 3 data files |
| knowledge-base-sources | 210 KB | 56 KB | merged | merged | now in data-static |
| academyStore | 79 KB | 28 KB | merged | merged | now in data-static |
| academyCoursesData | 78 KB | 28 KB | merged | merged | now in data-static |
| pages-public | 244 KB | 64 KB | 244 KB | 64 KB | unchanged |
| DashboardPage | 268 KB | 62 KB | 268 KB | 62 KB | unchanged |
| vendor-supabase | 173 KB | 46 KB | 173 KB | 46 KB | unchanged |
| pages-admin | 161 KB | 37 KB | 161 KB | 37 KB | unchanged |
| pages-pilot | 132 KB | 30 KB | 132 KB | 30 KB | unchanged |
| vendor-icons (lucide) | 131 KB | 24 KB | 131 KB | 24 KB | unchanged |
| pages-inspector | 123 KB | 31 KB | 123 KB | 31 KB | unchanged |

**All 70+ owner pages were already lazy-loaded** before this audit. Route-based code splitting was already well-implemented.

## What Was Changed

1. **vendor-three chunk** — Added explicit `vendor-three` chunk for the three.js library (used by `CanopyView3D`, `TerrainView`, and `ForestScanHero` — all already lazy-loaded). Previously appeared as `three.module` in the output.

2. **data-static chunk** — Merged `knowledge-base-sources`, `forestryGlossaryData`, and `academyStore` large static data files into a single named `data-static` chunk for clearer attribution and better caching (one cache entry instead of three separate ones that always update together).

3. **Preconnect hints** — Added PostHog EU endpoint preconnect to `index.html`.

4. **Bundle analyser** — Added `rollup-plugin-visualizer` (runs with `ANALYZE=true pnpm build`).

## What Remains Large and Why

- **index.js (812 KB raw / 262 KB gzip)** — This is the application shell: AppShell, all navigation (LeftRail, Sidebar, TopBar, BottomNav), auth store, i18n setup, push notification init, field mode layout, command palette, product tour, emergency flow. Everything in here must be present before the user sees any page. Cannot be reduced without major rearchitecting of the app shell.
- **vendor-maplibre (803 KB raw / 218 KB gzip)** — MapLibre GL is a full WebGL map renderer. It is unavoidably large. It IS already lazy-loaded (only pulled when a map page is visited), but Rollup still reports it in the output. No further action possible.
- **vendor-three (527 KB raw / 132 KB gzip)** — Three.js 3D renderer. Already lazy-loaded (only `CanopyView3D`, `TerrainView`, `ForestScanHero`). Unavoidable.
- **vendor-react (362 KB raw / 117 KB gzip)** — React 18 + React DOM + React Router. This is the minimum React bundle for a SPA.
- **DashboardPage (268 KB raw / 62 KB gzip)** — The main dashboard page imports many sub-components. Could be further split by lazy-loading individual dashboard cards/widgets, but that is high-effort for moderate gain.

## Images

- `public/icons/` — Contains PWA icons (icon-192.png, icon-512.png, etc.). These are standard PWA sizes and are not served on page load; the browser only downloads the relevant size. No action needed.
- `public/apple-touch-icon.png` — Check size; should be under 100 KB.
- `public/og-image.png` — OG image for social sharing. Not loaded on page view. No action needed.

## Recommended Next Steps

1. **Investigate index chunk** — Run `ANALYZE=true pnpm build` to open the visual treemap and identify which specific components/stores inside the `index` chunk are largest. The `CommandPalette`, `ProductTour`, and `EmergencyFlow` in AppShell could potentially be lazy-loaded.
2. **Lazy-load AppShell sub-components** — `CommandPalette`, `DailyCheckIn`, and `ContextualActions` in `AppShell.tsx` are not always visible and could be `React.lazy()` loaded.
3. **DashboardPage splitting** — The 268 KB Dashboard page could split its heavy chart/widget components (e.g. `CompanionPanel` at 87 KB) as lazy sub-components.
4. **knowledge-base-sources (210 KB)** — This is plain static text data. Consider hosting it on a CDN or fetching it on demand (only when the AI companion is opened) rather than bundling it.
