# ── Dependencies ──────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy package manifests only (for pnpm workspace resolution)
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# ── Development ───────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/core ./packages/core
COPY apps/web ./apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@gada-vn/web", "dev"]

# ── Builder ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/core ./packages/core
COPY apps/web ./apps/web
RUN pnpm --filter @gada-vn/web build

# ── Production ────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/
EXPOSE 3000
CMD ["pnpm", "--filter", "@gada-vn/web", "start"]
