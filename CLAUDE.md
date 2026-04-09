# CLAUDE.md — BeetleSense.ai

## Project Overview

BeetleSense.ai is a forest intelligence platform for beetle/pest monitoring in Swedish forestry. It detects bark beetle infestations, monitors forest health, estimates timber volumes, and provides AI-powered forestry advice. Three user roles: forest owners, drone pilots, and inspectors.

GitHub: ChristoSweden/beetlesense-platform
Deployed on Vercel (frontend).

## Tech Stack

Turborepo monorepo with pnpm workspaces.

| Layer     | Technology                                                     |
|-----------|----------------------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand, i18next |
| Backend   | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions)    |
| Workers   | Node.js, BullMQ, Redis (Valkey)                                 |
| Inference | Python, FastAPI, ONNX Runtime                                   |

## Key Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages and apps
pnpm lint             # Lint all packages
pnpm test             # Run all tests via Turbo
```

## Key Directories

```
apps/web/              # React frontend (Vite + Tailwind CSS)
apps/workers/          # BullMQ job processors (Node.js)
packages/shared/       # Shared types, Zod schemas, constants
supabase/functions/    # Deno Edge Functions
```

## Conventions

- Use pnpm, not npm
- All coordinates in SWEREF99 TM (EPSG:3006) in DB, convert to WGS84 at API boundary
- All UI strings go through i18next (Swedish primary, English secondary)
- Translation files: `apps/web/src/i18n/`
- Theme uses CSS custom properties (e.g. `var(--bg)`, `var(--green)`, `var(--text)`)

## AI Team Configuration (auto-generated 2026-04-09)

**Important: Use sub-agents when available for the task.**

**Detected Stack:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand, i18next, Supabase (PostGIS), BullMQ, Redis, Python/FastAPI, pnpm monorepo

| Task | Agent | Notes |
|------|-------|-------|
| Multi-step features | @tech-lead | Always start here for complex tasks |
| Team setup / refresh | @team-configurator | Run after stack changes |
| Code review | @code-reviewer | All PRs and before commits |
| Security audit | @security-auditor | Auth, APIs, user input, RLS policies |
| Performance | @performance-optimizer | Lighthouse, bundle size, query optimization |
| Testing | @test-engineer | Vitest units, Playwright E2E |
| Documentation | @doc-writer | API docs, user guides, i18n |
| React UI / components | @frontend-builder | Tailwind, Zustand, i18next |
| APIs / DB / Edge Functions | @backend-builder | Supabase, PostGIS, BullMQ |
| Marketing / SEO / growth | @growth-strategist | Swedish forestry market |
| Market research / strategy | @intelligence-analyst | Competitors, regulations, expansion |
