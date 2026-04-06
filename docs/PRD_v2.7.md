# BeetleSense.ai — Forest Intelligence Platform
## Product Requirements Document v2.7

**v2.7 | April 2026 | INTERNAL + INVESTOR USE | CONFIDENTIAL**
**Last updated: 6 April 2026**

---

## 1. Executive Summary

BeetleSense.ai is an AI-powered forest health intelligence platform for Swedish forest owners, drone pilots, and inspectors. Version 2.7 is a major UX streamlining release focused on making the platform accessible to non-technical forest owners while retaining full depth for power users and investors.

**What changed in v2.7**: The platform went from overwhelming (40+ widgets, 117 pages, 5-tab navigation with 20+ sub-items) to calm and guided — three navigation tabs, a question-based interface, and an AI companion as the primary interaction model.

**Mission**: Empower forest owners with the most complete, research-backed forest intelligence platform — and make sure they can actually use it without a manual.

**Vision**: A world in which no forest owner is caught off-guard by beetle infestation, disease, or environmental damage — because BeetleSense sees it first, explains it clearly, and tells them exactly what to do.

### Current Status (April 2026)

- **v2.7 SHIPPED** — UX streamlining, progressive disclosure, guided journeys, Wingman-first design
- **v2.6 LIVE** — Forest OS with 36+ dashboard widgets, 10 intelligence tiers, behavioral science components
- **Light theme is the default** — clean, light UI using CSS custom properties
- **Bilingual** — Swedish and English with language toggle (English default for testing)
- **Demo mode** — cycles through 4 risk scenarios (ok/watch/warning/critical) per visit
- **Deployed on Vercel** — auto-deploys from GitHub push to main

---

## 2. What's New in v2.7

### 2.1 Progressive Disclosure (3-Layer Architecture)

The dashboard now presents information in three layers. A forest owner never sees more than they need.

| Layer | What the user sees | When |
|-------|-------------------|------|
| **Layer 1: Postcard** | One headline, one number, one button. "Your forest is doing well." + accumulated value + "Ask the Forest" CTA | Default view on every visit |
| **Layer 2: Three Cards** | Health ring (92/100), forest value (12.4M kr), next action | Below the postcard |
| **Layer 3: Full Dashboard** | 36+ widgets in 4 collapsible sections | Only when user clicks "Show full dashboard" |

### 2.2 Guided Journeys (Replaces "Show All")

Instead of dumping all widgets, users choose a question:

| Journey | Question | Widgets Shown |
|---------|----------|---------------|
| Health | "How is my forest doing?" | Health Score, Breakdown, Early Warning, Beetle Forecast, Satellite, Weather |
| Money | "What is my forest worth?" | Timber Value, Market, Carbon, Asset Card, P&L, Harvest Optimizer |
| Action | "What should I do now?" | Advisor, Calendar, Beetle Countdown, Contractor, Storm |
| Learn | "I want to learn more" | Academy, First Year, Knowledge, Wiki, News |

**Smart ordering**: When risk score >= 50, the Health journey is promoted to a highlighted full-width card. When >= 30, the Action journey also rises.

### 2.3 Simplified Navigation

**Before (v2.6)**: 5 tabs with 20+ sub-items each.
**After (v2.7)**: 3 core tabs + expandable "Explore more" section.

| Tab | Label | Purpose |
|-----|-------|---------|
| 1 | My Forest | Parcels, surveys, calendar |
| 2 | Ask the Forest | Wingman AI companion |
| 3 | Monitoring | Beetle forecast, fire risk |
| Expand | Explore more | 12 advanced tools (satellite, carbon, compliance, community, etc.) |

Mobile bottom nav reduced from 5 tabs to 3, with the AI button elevated and centered.

### 2.4 Plain-Language Alerts

Badge counts (which created anxiety) replaced with calm sentences:

| Risk Level | Old | New |
|-----------|-----|-----|
| OK | Badge: "0" | "Nothing urgent right now — your forest looks good." |
| Watch | Badge: "3" | "We're keeping an eye on one thing, but nothing to worry about yet." |
| Warning | Badge: "5" | "Part of your forest needs attention soon." |
| Critical | Badge: "8" | "Something requires your action — read more below." |

### 2.5 Wingman as the Front Door

- **Quick-ask bar** at the top of every dashboard view: "Ask anything about your forest..."
- **Auto-greeting** on first visit: "Welcome! I'm your forest assistant. I can see your forest at Norra Skiftet is looking good today."
- **Suggested question chips** when conversation is empty: 4 contextual prompts based on risk level
- **Centered on mobile**: The AI button is the primary, elevated tab

### 2.6 Onboarding Tour

3-step modal walkthrough for first-time users:

1. **"This is your forest"** — explains the postcard and health indicators
2. **"Meet your AI assistant"** — introduces Wingman and natural language interaction
3. **"Choose your path"** — explains guided journeys

Stores completion in localStorage. Includes skip button and progress dots.

### 2.7 Collapsible Full Dashboard

When power users open the full dashboard, widgets are grouped into 4 collapsible sections instead of 10 flat tiers:

1. **Health & Threats** (open by default) — 18 widgets covering intelligence, forecasts, live data
2. **Actions & Planning** — advisor, weather, calendar, news, satellite, neighbors
3. **Financial Picture** — timber value, market, harvest optimizer, carbon, P&L, stats
4. **Deep Dive & Operations** — growth, rotation, compliance, insurance, contractors, learning, archive

### 2.8 Weekly Digest

Opt-in card at the bottom of the full dashboard. Forest owners enter their email to receive a weekly plain-language summary:

> "Your forest is healthy. No action needed this week."

Toggle switch + email input + example text. Backend edge function for delivery (planned).

### 2.9 Nine Additional UX Improvements

| Feature | Description |
|---------|-------------|
| **Demo scenario cycling** | Risk score cycles through ok/watch/warning/critical on each visit |
| **Widget loading skeletons** | Shimmer animation placeholders during lazy-load (card/chart/list variants) |
| **Empty states** | Friendly illustrations + CTAs on empty Surveys and Photo Gallery pages |
| **PDF export** | One-click printable forest health report (health score, value, risk, parcel) |
| **Photo AI analysis** | Mock beetle detection after photo capture (94% confidence, species ID) |
| **Neighbor comparison** | Bar chart: your forest health vs. neighbor average within 5 km |
| **Push notifications** | Service worker registration on dashboard mount for logged-in users |
| **Mobile-first layout** | Full-width postcard on small screens, sidebar only on desktop |
| **Wingman prompts** | 4 suggested question chips when AI conversation is empty |

---

## 3. Information Architecture (v2.7)

### 3.1 Navigation Structure

```
Core Tabs (always visible):
├── My Forest
│   ├── Parcels
│   ├── Surveys
│   └── Calendar
├── Ask the Forest (Wingman AI)
└── Monitoring
    ├── Beetle Forecast
    └── Fire Risk

Explore More (expandable):
├── Forest Profile
├── Satellite Data
├── Carbon Balance
├── Biodiversity
├── Compliance
├── Community (Nearby, Observations, Discussions, Marketplace)
├── Photos
├── Reports
├── Learning
├── Research
├── AI Lab
└── Settings
```

### 3.2 Mobile vs Desktop

| | Mobile | Desktop |
|---|---|---|
| **Navigation** | 3-tab bottom bar with elevated center AI button | Collapsible left rail with "Explore more" section |
| **Dashboard** | Full-width postcard + cards (no sidebar) | Sidebar panel over map |
| **Map** | Hidden (accessible via parcels) | Always visible background |
| **Wingman** | Full-screen chat | Side panel overlay |

---

## 4. User Experience Flow

### 4.1 First Visit (New User)

```
Landing Page → Sign Up → Onboarding (property ID) → Confetti
  ↓
Onboarding Tour (3 steps)
  ↓
Dashboard: Wingman Greeting → Postcard → Three Cards → Guided Journeys
```

### 4.2 Returning User (Everything OK)

```
Dashboard → Postcard: "Your forest is doing well."
  ↓
Quick-ask bar: "Ask anything about your forest..."
  ↓
Guided Journeys: "What would you like to know?"
```

### 4.3 Returning User (Risk Detected)

```
Dashboard → Postcard: "Your forest needs you."
  ↓
Highlighted Journey: "How is my forest doing?" (promoted, full-width)
  ↓
Health Journey: Health Score + Early Warning + Beetle Forecast
  ↓
CTA: "Ask Wingman for more"
```

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand, i18next |
| Backend | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions) |
| Workers | Node.js, BullMQ, Redis (Valkey) |
| Inference | Python, FastAPI, ONNX Runtime |
| Deployment | Vercel (frontend), Supabase (backend) |

### 5.2 Monorepo Structure

```
beetlesense-platform/
├── apps/web/          # React frontend (Vite + Tailwind CSS)
├── apps/workers/      # BullMQ job processors (Node.js)
├── packages/shared/   # Shared types, Zod schemas, constants
├── supabase/functions/ # Deno Edge Functions
└── docs/              # Documentation including this PRD
```

### 5.3 Key Design Decisions

- **Progressive disclosure over feature flags** — all features exist, but most are hidden behind "Explore more" or collapsible sections
- **AI-first interaction** — Wingman is the recommended path to any feature, reducing navigation complexity
- **Session-based demo cycling** — demo mode rotates through 4 risk scenarios so investors see the full range
- **localStorage for UI state** — tour completion, greeting dismissal, rail expansion stored client-side
- **No dark theme** — light theme only, per DESIGN.md. bg-black/40 for modal backdrops only

---

## 6. Design System

### 6.1 Visual Identity

| Token | Value |
|-------|-------|
| Background | `--bg: #F5F7F4` |
| Surface | `--bg2: #FFFFFF` |
| Primary green | `--green: #1B5E20` |
| Accent green | `#1A6B3C` (postcard, CTAs) |
| Body font | DM Sans |
| Serif font | Cormorant Garamond (postcard subtitles) |
| Display serif | DM Serif Display (postcard headlines) |
| Mono font | DM Mono (numbers, version) |
| Code font | JetBrains Mono |

### 6.2 Component Library

| Component | Purpose |
|-----------|---------|
| ForestPostcard | Calm, single-screen entry point with risk-based headline |
| ThreeCards | Health ring, forest value, next action |
| GuidedJourneys | 4 question-based paths with smart ordering |
| JourneyView | Filtered widget set for a chosen question |
| CollapsibleSection | Expandable dashboard group with chevron toggle |
| WingmanGreeting | First-visit welcome with personalized message |
| OnboardingTour | 3-step modal walkthrough |
| WeeklyDigestCard | Email opt-in for weekly summary |
| ExportReportButton | Printable PDF forest health report |
| WidgetSkeleton | Shimmer loading placeholder (card/chart/list) |
| EmptyState | Friendly illustration + CTA for empty pages |

---

## 7. Metrics & KPIs

### 7.1 Engagement

| Metric | Target | How Measured |
|--------|--------|-------------|
| Time to first meaningful interaction | < 10 seconds | Postcard load → first button click |
| Wingman usage rate | > 60% of sessions | Companion panel opens per session |
| Journey completion rate | > 40% of users | User selects a journey and views widgets |
| Tour completion rate | > 70% of new users | All 3 steps completed |
| Full dashboard expansion | < 20% of sessions | "Show full dashboard" clicks |

### 7.2 Retention

| Metric | Target |
|--------|--------|
| Weekly active users | Growing month over month |
| Weekly digest opt-in rate | > 15% of registered users |
| Return within 7 days | > 50% |

---

## 8. Roadmap

### Shipped (v2.7 — April 2026)
- [x] Progressive disclosure (3-layer postcard architecture)
- [x] Guided journeys with smart risk-based ordering
- [x] Simplified 3-tab navigation + "Explore more"
- [x] Plain-language alerts replacing badge counts
- [x] Wingman as the front door (quick-ask bar, greeting, prompts)
- [x] 3-step onboarding tour
- [x] Collapsible full dashboard (4 sections)
- [x] Weekly digest opt-in card
- [x] Demo scenario cycling
- [x] Widget loading skeletons
- [x] Empty states for Surveys and Photo Gallery
- [x] PDF export report
- [x] Photo AI analysis mock
- [x] Neighbor health comparison bars
- [x] Push notification initialization
- [x] Mobile-first dashboard layout
- [x] English labels for testing

### Next (v2.8 — planned)
- [ ] Real photo AI analysis via ONNX beetle detection model
- [ ] Weekly digest edge function (actual email delivery)
- [ ] Push notification content (risk changes, market updates)
- [ ] Neighbor comparison map overlay (color-coded parcels)
- [ ] Swedish language toggle (i18n already in place)
- [ ] Offline mode with service worker caching
- [ ] Parcel Wiki (knowledge base per parcel)

### Future
- [ ] SMS digest for non-smartphone users
- [ ] Voice input for Wingman (accessibility)
- [ ] Collaborative features (share parcels with family/advisor)
- [ ] Integration with Södra/SCA cooperative APIs
- [ ] EFI ForestWard Observatory grant deliverables (G-01-2026)

---

## 9. Risk & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Users never expand past the postcard | Low engagement with deep features | Guided journeys surface relevant widgets; Wingman can navigate to any feature |
| Demo mode doesn't reflect real data | Investor confusion | Cycling scenarios show all 4 risk states; clear "Demo" labeling |
| Push notifications blocked by browsers | Low re-engagement | Weekly digest email as fallback |
| Vercel build failures | Deployment delays | Separated install/build commands; removed --frozen-lockfile |
| Mobile sidebar cramped | Poor mobile UX | Full-width layout on mobile; sidebar only on lg+ breakpoint |

---

## 10. Appendix

### A. Version History

| Version | Date | Highlights |
|---------|------|-----------|
| v1.0 | March 2026 | Platform launch |
| v1.1 | March 2026 | AI Knowledge Wingman, RAG architecture, fire weather, biodiversity |
| v2.0 | March 2026 | Multi-source fusion, community intelligence, 4 pillars |
| v2.3 | April 2026 | 5-tab architecture, ForestWard Observatory, compound threat model |
| v2.6 | April 2026 | Forest OS with 36+ widgets, behavioral science, 10 intelligence tiers |
| **v2.7** | **April 2026** | **UX streamlining: progressive disclosure, guided journeys, Wingman-first, 3-tab nav, onboarding tour, 9 additional improvements** |

### B. Files Changed in v2.7

| File | Changes |
|------|---------|
| `LeftRail.tsx` | 3 core tabs + "Explore more" expandable section, English labels |
| `BottomNav5Tab.tsx` | Reduced to 3 tabs with centered AI button |
| `ForestPostcard.tsx` | English text, plain-language status sentences |
| `ThreeCards.tsx` | English labels |
| `DashboardPage.tsx` | Guided journeys, collapsible sections, Wingman greeting, onboarding tour, weekly digest, mobile-first layout, export button |
| `CompanionPanel.tsx` | Suggested question chips |
| `NeighborWidget.tsx` | Health comparison bar chart |
| `CapturePage.tsx` | Photo AI analysis mock |
| `SurveysPage.tsx` | Empty state component |
| `PhotoGalleryPage.tsx` | Empty state component |
| `swarmingProbabilityModel.ts` | Demo scenario cycling |
| `WidgetSkeleton.tsx` | New loading skeleton component |
| `EmptyState.tsx` | New empty state component |
| `ExportReportButton.tsx` | New PDF export component |
| `vercel.json` (root + apps/web) | Fixed install/build commands |
