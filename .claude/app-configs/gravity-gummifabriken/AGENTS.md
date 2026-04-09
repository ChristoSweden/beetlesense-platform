# AGENTS.md — Gravity (Gummifabriken)

## Agent Context

You are an AI agent working on Gravity, a proximity-based professional networking platform.
This is part of a 3-app portfolio operated by one person through AI agent teams.

Sister apps: BeetleSense (forest intelligence), Pilot-Speak (pilot training).

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read `pitch.md` for product vision, target audience, and feature set
3. Run `npm install` if node_modules is missing
4. Run `npm test` to verify current state

## Key Rules

- Use npm (not pnpm)
- TypeScript strict mode
- Supabase for auth, database, realtime
- Google GenAI (Gemini) for semantic matching
- PWA-first with offline support
- Write tests for new code
- Run `npm test` before committing

## Agent Teams

See BeetleSense repo `.claude/agent-teams.md` for the full multi-app agent organization.

### Build Team Prompt
> You are the Build Team for Gravity (gravity-gummifabriken). This is a proximity-based
> professional networking PWA. Uses Supabase for auth/DB/realtime, Google GenAI (Gemini)
> for semantic matching and embeddings, Google Maps + Geohashing for proximity.
> Read pitch.md for product context. Run `npm test` before committing.

### QA Team Prompt
> You are the QA Team for Gravity. Test matching algorithm accuracy, proximity features,
> PWA offline mode, Supabase realtime connections, and profile flows.
> Run Lighthouse audits for PWA score. Report issues with reproduction steps.

## Target Audience

- **Primary:** Active networkers, age 28-45, mid-senior professionals, founders, consultants
- **Secondary:** Knowledge seekers, age 23-35, early-career professionals

## Core Features

- AI-powered semantic matching (0-100% score)
- Real-time proximity radar
- Intent-based profiles ("Looking For")
- Privacy-first location controls
- LinkedIn co-existence integration

## Current Priorities (April 2026)

| Priority | Task |
|----------|------|
| P0 | Core matching algorithm refinement |
| P0 | Supabase realtime proximity features |
| P1 | PWA install and offline support |
| P1 | Värnamo/Gummifabriken pilot launch |
| P2 | LinkedIn co-existence integration |
