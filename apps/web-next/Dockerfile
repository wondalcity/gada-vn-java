# ── Stage 1: Install dependencies ───────────────────────────────────────────
# Build context must be the monorepo root so pnpm workspace resolves correctly.
# docker-compose: context: ../../  dockerfile: apps/web-next/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace manifests first (cache layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web-next/package.json ./apps/web-next/
COPY packages/ui/package.json ./packages/ui/

# Install web-next + workspace package dependencies
RUN pnpm install --filter=@gada/web... --frozen-lockfile

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web-next/node_modules ./apps/web-next/node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

# Build args baked into the JS bundle at build time
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_CDN_DOMAIN
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_CDN_DOMAIN=$NEXT_PUBLIC_CDN_DOMAIN \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN pnpm --filter=@gada/web build

# ── Stage 3: Production runner (standalone) ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# pnpm standalone symlinks point to ../../../node_modules/.pnpm/...
# which from /app/node_modules/ resolves to /node_modules/.pnpm/
# Create the expected path so symlinks resolve correctly.
RUN mkdir -p /node_modules && ln -s /app/node_modules/.pnpm /node_modules/.pnpm

COPY --from=builder /repo/apps/web-next/public ./public
# 1. Copy standalone root (contains node_modules/next, node_modules/react, etc.)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web-next/.next/standalone/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web-next/.next/standalone/package.json ./package.json
# 2. Copy app-level server.js and its node_modules
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web-next/.next/standalone/apps/web-next/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web-next/.next/standalone/apps/web-next/node_modules ./node_modules/
# 3. Copy static assets
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web-next/.next/static ./.next/static

USER nextjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || wget -qO- http://localhost:3000/ > /dev/null || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
