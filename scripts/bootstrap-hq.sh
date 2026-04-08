#!/bin/bash
# =============================================================
# Christo HQ Bootstrap Script
# Run this ONCE from your local machine to set up the portfolio
# command center with all apps as submodules.
#
# Usage: bash scripts/bootstrap-hq.sh
# =============================================================
set -e

HQ_DIR="${HOME}/christo-hq"

if [ -d "$HQ_DIR/.git" ]; then
  echo "christo-hq already exists at $HQ_DIR — skipping init"
  cd "$HQ_DIR"
else
  echo "=== Creating Christo HQ ==="
  mkdir -p "$HQ_DIR"
  cd "$HQ_DIR"
  git init
  git branch -m main
  git remote add origin git@github.com:ChristoSweden/christo-hq.git
fi

# --- Create directory structure ---
mkdir -p .claude/templates scripts apps

# --- CLAUDE.md ---
cat > CLAUDE.md << 'HEREDOC'
# CLAUDE.md — Christo HQ

## Overview

This is the portfolio command center for a one-person business running multiple apps
through AI agent teams. Each app lives in `apps/` as a git submodule with its own repo.

## Apps

| App | Repo | Description | Status |
|-----|------|-------------|--------|
| BeetleSense | ChristoSweden/beetlesense-platform | Forest intelligence for beetle monitoring | v2.7 Production |
| Pilot-Speak 4.0 | ChristoSweden/Pilot-Speak-4.0 | Speech/pilot training platform | Active dev |
| Gravity | ChristoSweden/gravity-gummifabriken | Proximity professional networking | v3.0 Active dev |

## Quick Start

```bash
git clone --recurse-submodules git@github.com:ChristoSweden/christo-hq.git
cd christo-hq
./scripts/setup.sh
```

## Adding a New App

```bash
git submodule add git@github.com:ChristoSweden/<repo-name>.git apps/<app-name>
cp .claude/templates/CLAUDE.md.template apps/<app-name>/CLAUDE.md
cp .claude/templates/AGENTS.md.template apps/<app-name>/AGENTS.md
# Edit configs, add to agent-teams.md, commit
```

## Conventions (All Apps)

- TypeScript strict mode
- Tests required for new code
- Lint + test before committing
- Descriptive commit messages
- Swedish primary language where applicable
HEREDOC

# --- AGENTS.md ---
cat > AGENTS.md << 'HEREDOC'
# AGENTS.md — Christo HQ

## Agent Context

You are an AI agent working in the Christo HQ portfolio command center.
This workspace manages multiple apps through AI agent teams.
The operator acts as CEO — you report to them.

## Before You Start

1. Read `CLAUDE.md` for the app portfolio overview
2. Read `.claude/agent-teams.md` for team assignments and workflows
3. Each app in `apps/` has its own CLAUDE.md and AGENTS.md
4. Run `./scripts/setup.sh` to install dependencies across all apps

## Key Rules

- Never push directly to an app's main branch without approval
- Always run tests in the target app before committing
- Cross-app changes need coordination — flag to CEO
- Each app may use different package managers (pnpm vs npm) — check its CLAUDE.md

## Portfolio Commands

```bash
./scripts/setup.sh         # Install deps for all apps
./scripts/status.sh        # Git status across all apps
./scripts/test-all.sh      # Run tests across all apps
```
HEREDOC

# --- .claude/agent-teams.md ---
cat > .claude/agent-teams.md << 'HEREDOC'
# AI Agent Organization — Christo HQ

## Overview

One-person business operating multiple apps through AI agent teams. Each team is a
Claude Code session with a specific mandate. The operator acts as CEO.

## App Portfolio

| App | Directory | Pkg Manager | Test Command | Status |
|-----|-----------|-------------|--------------|--------|
| BeetleSense | apps/beetlesense-platform | pnpm | pnpm test | v2.7 Production |
| Pilot-Speak 4.0 | apps/pilot-speak-4.0 | npm | npm test | Active dev |
| Gravity | apps/gravity-gummifabriken | npm | npm test | v3.0 Active dev |

## Agent Teams

### Team 1: Build Team — Ship features and fix bugs (one session per app)
### Team 2: QA Team — Test everything before it ships
### Team 3: DevOps Team — CI/CD, deployment, monitoring
### Team 4: Growth Team — User acquisition and retention
### Team 5: Content Team — Docs, translations, copy
### Team 6: Intelligence Team — Research, strategy, competitors

## Session Prompts

### BeetleSense Build
> Working in apps/beetlesense-platform. pnpm. i18next (SV primary). SWEREF99 TM coords.
> Run pnpm lint && pnpm test before committing.

### Pilot-Speak Build
> Working in apps/pilot-speak-4.0. Focus: speech services (scenarioEngine,
> speechScoringService, voicePoolService, sessionRecorder, ttsService).
> Run npm test before committing.

### Gravity Build
> Working in apps/gravity-gummifabriken. Proximity networking PWA.
> Supabase + Google GenAI. Read pitch.md. npm test before committing.

### QA (any app)
> Tell me which app to test. I run tests, Lighthouse, PWA/offline, i18n checks.

### Growth (any app)
> Tell me which app. I handle SEO, landing pages, analytics, partnerships.

### Intelligence
> I monitor competitors, regulations, markets across all apps.

## Daily Workflow

```
Morning:   ./scripts/status.sh → set priorities
Sessions:  Build Teams (parallel per app)
Evening:   Review commits, approve deploys
```

## Adding a New App

1. git submodule add git@github.com:ChristoSweden/<repo>.git apps/<name>
2. cp .claude/templates/CLAUDE.md.template apps/<name>/CLAUDE.md
3. cp .claude/templates/AGENTS.md.template apps/<name>/AGENTS.md
4. Edit both, add to portfolio table, commit
HEREDOC

# --- Templates ---
cat > .claude/templates/CLAUDE.md.template << 'HEREDOC'
# CLAUDE.md — [APP NAME]

## Project Overview
[What this app does, who it's for.]

GitHub: ChristoSweden/[repo-name]

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | [React 19, Vite, Tailwind] |
| Backend | [Supabase, Node.js] |

## Key Commands
```bash
[npm/pnpm] install / dev / build / test / lint
```

## Conventions
- [Package manager]
- TypeScript strict mode
- Tests for new code
HEREDOC

cat > .claude/templates/AGENTS.md.template << 'HEREDOC'
# AGENTS.md — [APP NAME]

## Agent Context
You are an AI agent working on [APP NAME], [description].
Part of a multi-app portfolio. Sister apps: [list].

## Before You Start
1. Read CLAUDE.md
2. [npm/pnpm] install
3. [npm/pnpm] test

## Build Team Prompt
> You are the Build Team for [APP NAME]. [Context.] Run tests before committing.

## Current Priorities
| Priority | Task |
|----------|------|
| P0 | [Most urgent] |
HEREDOC

# --- Scripts ---
cat > scripts/setup.sh << 'HEREDOC'
#!/bin/bash
set -e
echo "=== Christo HQ — Setup ==="
git submodule update --init --recursive
for app in apps/*/; do
  name=$(basename "$app")
  echo "→ $name"
  cd "$app"
  if [ -f "pnpm-lock.yaml" ]; then pnpm install; else npm install; fi
  cd ../..
  echo "  ✓ $name ready"
done
echo "=== Done ==="
HEREDOC

cat > scripts/status.sh << 'HEREDOC'
#!/bin/bash
echo "=== Portfolio Status ==="
for app in apps/*/; do
  [ -d "$app/.git" ] || [ -f "$app/.git" ] || continue
  name=$(basename "$app")
  branch=$(git -C "$app" branch --show-current 2>/dev/null)
  changes=$(git -C "$app" status --porcelain 2>/dev/null | wc -l)
  printf "%-30s [%-12s] %s\n" "$name" "$branch" "$([ $changes -eq 0 ] && echo 'clean' || echo "$changes changes")"
done
echo "=== Done ==="
HEREDOC

cat > scripts/test-all.sh << 'HEREDOC'
#!/bin/bash
echo "=== Test All ==="
FAIL=0
for app in apps/*/; do
  name=$(basename "$app")
  echo "→ $name"
  cd "$app"
  if [ -f "pnpm-lock.yaml" ]; then
    pnpm test || FAIL=1
  else
    npm test || FAIL=1
  fi
  cd ../..
done
[ $FAIL -eq 0 ] && echo "=== ALL PASSED ===" || { echo "=== FAILURES ==="; exit 1; }
HEREDOC

cat > .gitignore << 'HEREDOC'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
HEREDOC

chmod +x scripts/*.sh

# --- Add submodules ---
echo ""
echo "=== Adding apps as submodules ==="
git submodule add git@github.com:ChristoSweden/beetlesense-platform.git apps/beetlesense-platform 2>/dev/null || echo "beetlesense-platform already added"
git submodule add git@github.com:ChristoSweden/Pilot-Speak-4.0.git apps/pilot-speak-4.0 2>/dev/null || echo "pilot-speak-4.0 already added"
git submodule add git@github.com:ChristoSweden/gravity-gummifabriken.git apps/gravity-gummifabriken 2>/dev/null || echo "gravity-gummifabriken already added"

# --- Commit and push ---
git add -A
git commit -m "feat: Initialize Christo HQ with agent framework and 3 app submodules"
git push -u origin main

echo ""
echo "============================================"
echo "  Christo HQ is live!"
echo "  https://github.com/ChristoSweden/christo-hq"
echo ""
echo "  Next: open christo-hq in Claude Code"
echo "  and your agent teams are ready to go."
echo "============================================"
