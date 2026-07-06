# ============================================================================
# 🐳 DOCKERFILE — Bokoma Backend (Express.js + Mongoose)
# ============================================================================
# Multi-stage build : 
#   1) deps  → installe uniquement les dépendances prod
#   2) final → copie le code et lance node
#
# Build :  docker build -t bokoma-backend .
# Run   :  docker run -p 5000:5000 --env-file .env bokoma-backend
# ============================================================================

# ─── Stage 1 : deps ──────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Librairies nécessaires pour bcryptjs / mongoose en environnement natif
RUN apk add --no-cache python3 make g++

# Copie uniquement les manifests pour profiter du cache Docker
COPY package*.json ./

# Install --omit=dev = prod uniquement
RUN npm ci --omit=dev --legacy-peer-deps

# ─── Stage 2 : final ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Crée un utilisateur non-root (sécurité)
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nodejs -u 1001

# Copie les node_modules depuis l'étape deps
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copie le code source
COPY --chown=nodejs:nodejs . .

# Crée les dossiers requis (si absents du repo)
RUN mkdir -p uploads logs \
 && chown -R nodejs:nodejs uploads logs

USER nodejs

EXPOSE 5000

# Healthcheck natif
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health \
      || exit 1

CMD ["node", "./src/server.js"]
