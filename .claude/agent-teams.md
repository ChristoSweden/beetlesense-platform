# AI Agent Organization — Multi-App Business

## Overview

One-person business operating 3 apps through AI agent teams. Each team is a Claude Code
session with a specific mandate. The operator (you) acts as CEO — reviewing outputs,
approving deployments, and setting priorities across the portfolio.

---

## App Portfolio

| App | Repo | Description | Tech | Status |
|-----|------|-------------|------|--------|
| **BeetleSense** | ChristoSweden/beetlesense-platform | Forest intelligence for beetle monitoring | React 19, Vite 6, Supabase, PostGIS, Tailwind 4, pnpm | v2.7 — Production |
| **Pilot-Speak 4.0** | ChristoSweden/Pilot-Speak-4.0 | Speech/pilot training platform | TypeScript, speech services | Active development |
| **Gravity** | ChristoSweden/gravity-gummifabriken | Proximity professional networking | React 19, Vite, Supabase, Google GenAI, Tailwind 4, npm | v3.0 — Active development |

---

## Agent Teams

### Team 1: Build Team (Feature Development)

**Mission:** Ship features and fix bugs across all 3 apps.

**Session prompts (one per app):**

> **BeetleSense Build:**
> You are the Build Team for BeetleSense. Read CLAUDE.md and docs/ROADMAP.md.
> Use pnpm. i18next for all strings (SV primary). SWEREF99 TM coords in DB.
> Run `pnpm lint && pnpm test` before committing.

> **Pilot-Speak Build:**
> You are the Build Team for Pilot-Speak 4.0. This is a speech/pilot training platform.
> Focus on the speech services (scenarioEngine, speechScoringService, voicePoolService,
> sessionRecorder, soloReadinessService, ttsService, trafficService).
> Run tests before committing.

> **Gravity Build:**
> You are the Build Team for Gravity (gravity-gummifabriken). This is a proximity-based
> professional networking PWA. Uses Supabase for auth/DB/realtime, Google GenAI (Gemini)
> for semantic matching and embeddings. Uses npm (not pnpm). Read pitch.md for product context.
> Run `npm test` before committing.

**Cadence:** Daily sessions during active sprints

---

### Team 2: QA Team (Quality Assurance)

**Mission:** Ensure every release across all apps is production-ready.

**Per-app test commands:**
- BeetleSense: `pnpm test` (Vitest) + Playwright E2E
- Pilot-Speak: Check test scripts in package.json
- Gravity: `npm test` (Vitest)

**Responsibilities:**
- Run unit and E2E test suites
- Lighthouse audits (performance, accessibility, SEO, PWA)
- Security checklist reviews
- Cross-browser and offline/PWA testing
- i18n completeness verification

**Cadence:** After each Build sprint or before deployments

---

### Team 3: DevOps Team (Infrastructure & Deployment)

**Mission:** Keep all apps running, fast, and secure.

**Per-app infra:**
- BeetleSense: Vercel (frontend) + Docker (backend) + GitHub Actions CI/CD
- Pilot-Speak: Check deployment config
- Gravity: Vercel deployment

**Responsibilities:**
- CI/CD pipeline maintenance (GitHub Actions)
- Docker Compose configs (BeetleSense: dev/staging/prod)
- Monitoring (Prometheus + Grafana for BeetleSense)
- SSL, DNS, domain management per app
- Dependency updates and security patches across all repos
- Staging environment validation

**Cadence:** Weekly health checks + on-demand for deployments

---

### Team 4: Growth Team (Marketing & Acquisition)

**Mission:** Drive user acquisition for each app in its target market.

**Per-app strategy:**

| App | Target Market | Growth Channels |
|-----|--------------|-----------------|
| BeetleSense | Swedish forest owners (50-500 ha) | SEO (granbarkborre, skogsbruk), cooperatives, government partnerships |
| Pilot-Speak | Student pilots, flight schools | Aviation communities, flight school partnerships, app stores |
| Gravity | Professionals 28-45, founders, consultants | LinkedIn, coworking spaces, tech events, Värnamo/Gummifabriken community |

**Responsibilities:**
- Landing page optimization per app
- SEO and content marketing
- Analytics review (PostHog, Vercel Analytics)
- Social media content
- Partnership outreach materials
- App Store / PWA install optimization
- Email campaign templates

**Cadence:** Weekly strategy + content sprints

---

### Team 5: Content Team (Documentation & Copy)

**Mission:** Keep docs current, translations complete, and copy compelling.

**Per-app focus:**
- BeetleSense: i18n (SV/EN), user guide, API docs, AI companion knowledge base
- Pilot-Speak: In-app speech scenarios, user onboarding copy
- Gravity: Profile copy, matching explanation text, pitch deck updates

**Responsibilities:**
- Translation audits (Swedish primary)
- User guides and onboarding flows
- Blog posts and thought leadership
- Knowledge base articles
- Pitch decks and investor materials

**Cadence:** After each feature release + monthly content sprints

---

### Team 6: Intelligence Team (Research & Strategy)

**Mission:** Keep business strategy sharp across the portfolio.

**Per-app intelligence:**
- BeetleSense: Nordic forestry market, EU regulations (EUDR, LULUCF), competitor platforms
- Pilot-Speak: Aviation training market, speech AI competitors, flight school partnerships
- Gravity: Professional networking trends, proximity tech, LinkedIn alternatives

**Responsibilities:**
- Competitor monitoring per vertical
- Regulation and compliance tracking
- Market sizing and opportunity assessment
- User feedback synthesis
- Feature prioritization recommendations
- Pricing strategy validation
- Expansion opportunity assessment

**Cadence:** Bi-weekly reports + ad-hoc research

---

## How to Run Agent Teams

### Option 1: Claude Code Web (claude.ai/code)
Open separate browser tabs — one session per team per app.

### Option 2: VS Code Agent Panels
Use the Antigravity extension panels:
- Left VS Code window → one app's Build Team
- Right VS Code window → another app's Build Team
- Web session → CEO dashboard / Intelligence Team

### Option 3: Claude Code CLI
```bash
# Start Build Teams for each app in parallel
cd ~/beetlesense-platform && claude --session "bs-build" &
cd ~/Pilot-Speak-4.0 && claude --session "ps-build" &
cd ~/gravity-gummifabriken && claude --session "gv-build" &
```

### Recommended Daily Setup (3 apps)
```
┌─────────────────────┬─────────────────────┐
│  VS Code Window 1   │  VS Code Window 2   │
│  Pilot-Speak 4.0    │  Gravity             │
│  [Agent: Build]     │  [Agent: Build]      │
├─────────────────────┴─────────────────────┤
│        Browser: claude.ai/code            │
│  Tab 1: BeetleSense Build                 │
│  Tab 2: QA Team (rotates across apps)     │
│  Tab 3: Growth/Intelligence (as needed)   │
└───────────────────────────────────────────┘
```

---

## Cross-Team Workflows

### Feature Release Flow (per app)
```
Build Team → QA Team → DevOps Team → Growth Team → Content Team
   (code)     (test)    (deploy)     (announce)    (document)
```

### Weekly Rhythm (all apps)
```
Monday:     Intelligence brief → CEO sets weekly priorities per app
Tue-Thu:    Build Teams execute (3 parallel sessions, one per app)
Friday AM:  QA Team rotates across all 3 apps
Friday PM:  DevOps Team deploys green builds
Saturday:   Growth Team publishes content for highest-priority app
Sunday:     Content Team updates docs across portfolio
```

### Escalation Path
```
Any Team → CEO (you) → Decision → Assigned Team + App
```

---

## Priority Matrix (April 2026)

### BeetleSense (Production — needs real data)
| Priority | Task | Team |
|----------|------|------|
| P0 | Replace demo data with real integrations | Build |
| P0 | Connect to mill purchasing (SDC/VIOL) | Build |
| P1 | Seed forum with real content | Content + Growth |
| P1 | iOS push notification reliability | Build + DevOps |
| P1 | Cooperative integrations (Södra, SCA) | Build |

### Pilot-Speak 4.0 (Active development)
| Priority | Task | Team |
|----------|------|------|
| P0 | Assess current state and create roadmap | Intelligence + Build |
| P1 | Speech scoring accuracy validation | QA |
| P1 | User onboarding flow | Build + Content |
| P2 | Flight school partnership materials | Growth |

### Gravity (Active development — v3.0)
| Priority | Task | Team |
|----------|------|------|
| P0 | Core matching algorithm refinement | Build |
| P0 | Supabase realtime proximity features | Build |
| P1 | PWA install and offline support | Build + DevOps |
| P1 | Värnamo/Gummifabriken pilot launch | Growth |
| P2 | LinkedIn co-existence integration | Build + Intelligence |
