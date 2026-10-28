# ==============================================================
# Production Dockerfile for @akufada/backend
# Multi-stage build for minimal runtime image & non-root security
# ==============================================================

# Stage 1: Build & Prune
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL & libc for Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy repository manifests for cached layer installation
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/mock-payment/package.json ./apps/mock-payment/

# Install dependencies reproducibly
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Build shared package and generate Prisma Client
RUN npm run build:shared
RUN cd apps/backend && npx prisma generate

# Compile backend TypeScript
RUN npm run build:backend

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL and curl for container health check
RUN apk add --no-cache openssl curl dumb-init

ENV NODE_ENV=production
ENV PORT=3001

# Copy package descriptors and built artifacts
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Security: run as non-root user
USER node

WORKDIR /app/apps/backend

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health/ready || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]
