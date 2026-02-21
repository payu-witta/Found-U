# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./

# Copy package manifests
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/db ./packages/db
COPY packages/ai ./packages/ai
COPY apps/backend ./apps/backend

# Build
RUN pnpm --filter @foundu/db build
RUN pnpm --filter @foundu/ai build
RUN pnpm --filter @foundu/backend build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S foundu -u 1001

WORKDIR /app

# Copy workspace manifests for production install
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/ai/package.json ./packages/ai/
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Install production only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Use non-root user
USER foundu

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/backend/dist/index.js"]
