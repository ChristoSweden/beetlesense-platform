# AGENTS.md — Pilot-Speak 4.0

## Agent Context

You are an AI agent working on Pilot-Speak 4.0, a speech and pilot training platform.
This is part of a 3-app portfolio operated by one person through AI agent teams.

Sister apps: BeetleSense (forest intelligence), Gravity (professional networking).

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Run `npm install` if node_modules is missing
3. Run `npm test` to verify current state

## Key Rules

- TypeScript strict mode
- Write tests for new code
- Run `npm test && npm run lint` before committing
- Descriptive commit messages

## Agent Teams

See BeetleSense repo `.claude/agent-teams.md` for the full multi-app agent organization.

### Build Team Prompt
> You are the Build Team for Pilot-Speak 4.0. This is a speech/pilot training platform.
> Focus on speech services: scenarioEngine, speechScoringService, voicePoolService,
> sessionRecorder, soloReadinessService, ttsService, trafficService.
> Run `npm test` before committing.

### QA Team Prompt
> You are the QA Team for Pilot-Speak 4.0. Run all tests, check speech scoring accuracy,
> verify scenario flows, and test TTS output quality. Report issues with reproduction steps.

## Current Priorities (April 2026)

| Priority | Task |
|----------|------|
| P0 | Assess current state and create development roadmap |
| P1 | Speech scoring accuracy validation |
| P1 | User onboarding flow |
| P2 | Flight school partnership materials |
