# ---------- Stage 1: Install dependencies ----------
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy workspace root files for pnpm install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/workers/package.json apps/workers/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --filter @beetlesense/workers...

# ---------- Stage 2: Build ----------
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/workers/node_modules ./apps/workers/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/workers/ apps/workers/

RUN pnpm --filter @beetlesense/workers build

# ---------- Stage 3: Production ----------
FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production

# Copy only what we need to run
COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /app/apps/workers/package.json ./
COPY --from=deps /app/apps/workers/node_modules ./node_modules

# Use tini for proper signal handling in containers
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.cjs"]

# Health check: ensure the process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

EXPOSE 3001
