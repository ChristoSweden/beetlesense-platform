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
