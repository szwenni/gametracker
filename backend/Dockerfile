# Build context: project root (run with docker build -f backend/Dockerfile .)

# ── Stage 1: Install production dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Build TypeScript ──
FROM node:22-alpine AS builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src/ ./src/
COPY shared/ ./shared/
RUN npx tsc -p tsconfig.build.json

# ── Stage 3: Production image ──
FROM node:22-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist/src ./dist
COPY backend/package.json ./
COPY database/migrations ./migrations

ENV MIGRATIONS_DIR=/app/backend/migrations

RUN mkdir -p public/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
