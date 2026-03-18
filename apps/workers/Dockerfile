# ============================================================
# Stage 1: Install dependencies and build TypeScript
# ============================================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy package.json files for all workspaces (for dependency resolution)
COPY apps/workers/package.json apps/workers/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install all dependencies (dev deps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ packages/shared/
COPY apps/workers/ apps/workers/
COPY tsconfig.base.json ./

# Build shared package first, then workers
RUN pnpm --filter @beetlesense/shared build && \
    pnpm --filter @beetlesense/workers build

# Prune to production dependencies
RUN pnpm --filter @beetlesense/workers --prod deploy /app/pruned

# ============================================================
# Stage 2: Production runtime
# ============================================================
FROM node:20-alpine AS runtime

RUN apk add --no-cache curl tini

# Create non-root user
RUN addgroup -g 1001 -S beetlesense && \
    adduser -S beetlesense -u 1001 -G beetlesense

WORKDIR /app

ENV NODE_ENV=production

# Copy built files and production node_modules from pruned deploy
COPY --from=builder /app/pruned/node_modules ./node_modules
COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /app/apps/workers/package.json ./package.json

# Copy shared package dist (needed at runtime)
COPY --from=builder /app/packages/shared/dist ./node_modules/@beetlesense/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@beetlesense/shared/package.json

# Switch to non-root user
USER beetlesense

# Health check against the health server
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

EXPOSE 3002

# Use tini for proper signal handling in containers
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.cjs"]
