# CLAUDE.md — Gravity (Gummifabriken)

## Project Overview

Gravity is a proximity-based professional networking platform. It helps ambitious professionals discover highly relevant people nearby through AI-powered interest matching and real-time proximity radar.

Tagline: "Proximity creates Opportunity" — LinkedIn helps you collect contacts, Gravity helps you build legacy.

GitHub: ChristoSweden/gravity-gummifabriken

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Backend | Supabase (Auth, Database, Realtime, Edge Functions) |
| AI | Google GenAI (Gemini) — semantic matching, embeddings |
| Maps | Google Maps + Geohashing |
| PWA | Workbox, vite-plugin-pwa |

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests (Vitest)
npm run test:watch   # Watch mode tests
```

## Conventions

- Use npm (not pnpm)
- TypeScript strict mode
- Tailwind CSS 4 for styling
- Supabase for all backend services
- Google GenAI (Gemini) for AI features
- PWA-first — offline support required
- Read pitch.md for product context and target audience
