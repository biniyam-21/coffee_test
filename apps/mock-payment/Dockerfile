# ==============================================================
# Production Dockerfile for @akufada/mock-payment
# Lightweight Node.js 20 Alpine service for mock external provider
# ==============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/mock-payment/package.json ./apps/mock-payment/

RUN npm ci

COPY tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/mock-payment/ ./apps/mock-payment/

RUN npm run build:shared
RUN cd apps/mock-payment && npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl dumb-init

ENV NODE_ENV=production
ENV MOCK_PAYMENT_PORT=4000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/mock-payment/package.json ./apps/mock-payment/package.json
COPY --from=builder /app/apps/mock-payment/dist ./apps/mock-payment/dist

USER node

WORKDIR /app/apps/mock-payment

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
