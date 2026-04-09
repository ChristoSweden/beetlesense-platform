# AGENTS.md — BeetleSense.ai

## Agent Context

You are an AI agent working on BeetleSense.ai, a forest intelligence platform
for beetle/pest monitoring in Swedish forestry. This is a one-person business
that operates through AI agent teams.

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read `.claude/agent-teams.md` for your team assignment and mandate
3. Check `docs/ROADMAP.md` for current sprint priorities
4. Run `pnpm install` if node_modules is missing

## Key Rules for All Agents

- **pnpm only** — never use npm or yarn
- **Coordinates** — SWEREF99 TM (EPSG:3006) in DB, WGS84 at API boundary
- **i18n** — all UI strings through i18next (apps/web/src/i18n/), Swedish primary
- **Theme** — use CSS custom properties: `var(--bg)`, `var(--green)`, `var(--text)`
- **Types** — shared types live in `packages/shared/`, use Zod schemas for validation
- **Tests** — write tests for new code, run `pnpm test` before committing
- **Lint** — run `pnpm lint` before committing
- **Commits** — descriptive messages, reference sprint/issue when applicable

## Verification Commands

```bash
pnpm install          # Install dependencies
pnpm lint             # Must pass before commit
pnpm test             # Must pass before commit
pnpm build            # Must pass before deploy
pnpm dev              # Start dev server for manual testing
```

## Architecture Quick Reference

```
apps/web/              → React 19 + Vite 6 + Tailwind 4 (frontend)
apps/workers/          → BullMQ job processors (backend tasks)
packages/shared/       → Types, Zod schemas, constants
supabase/functions/    → Deno Edge Functions (serverless API)
infra/                 → Docker, monitoring, staging configs
docs/                  → PRD, SWOT, architecture, API docs
```

## Current State (April 2026)

- **Version:** v2.7.0 (production, deployed on Vercel)
- **Status:** Post-launch optimization phase
- **Key gap:** Demo data needs replacing with real integrations (see SWOT_v2.7.md)
- **Next milestones:** Real mill connections (SDC/VIOL), iOS push fix, Nordic expansion
