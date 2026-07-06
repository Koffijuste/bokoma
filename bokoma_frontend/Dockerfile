# ============================================================================
# 🐳 DOCKERFILE — Bokoma Frontend (Next.js 15)
# ============================================================================
# Multi-stage :
#   1) deps   → npm ci
#   2) build  → next build (mode standalone)
#   3) runner → copie le bundle standalone + static, lance node
#
# Build :  DOCKER_BUILD=1 docker build -t bokoma-frontend .
# Run   :  docker run -p 3000:3000 --env-file .env bokoma-frontend
# ============================================================================

# ─── Stage 1 : deps ──────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ─── Stage 2 : build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3 : runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nextjs -u 1001

# Copie le bundle standalone (Next.js a tout inclus grâce à output:'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static       ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public             ./public

USER nextjs

EXPOSE 3000

# Healthcheck (Next.js expose / quand le serveur est up)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ \
      || exit 1

CMD ["node", "server.js"]
