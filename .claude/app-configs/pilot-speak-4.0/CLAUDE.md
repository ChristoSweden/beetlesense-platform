# CLAUDE.md — Pilot-Speak 4.0

## Project Overview

Pilot-Speak 4.0 is a speech and pilot training platform. It provides scenario-based training with speech scoring, voice pools, solo readiness assessment, and text-to-speech services for aviation students and flight schools.

GitHub: ChristoSweden/Pilot-Speak-4.0

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Services | scenarioEngine, sessionRecorder, speechScoringService, soloReadinessService, voicePoolService, subscriptionService, trafficService, ttsService |

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint code
```

## Key Directories

```
src/services/        # Core service modules
src/components/      # UI components
```

## Conventions

- TypeScript strict mode
- Tests required for all new services
- Run lint + test before committing
