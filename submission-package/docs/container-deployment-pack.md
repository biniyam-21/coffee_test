# Container and Deployment Pack

## Container architecture

The root Docker Compose file defines PostgreSQL 16, a one-shot Prisma migration job, two Nest API containers, a mock payment service, a web static server, and an Nginx gateway. The web and backend have separate multi-stage Dockerfiles. The API nodes share the same database and mock/payment configuration. The default gateway HTTP port is 80; the database is bound to 127.0.0.1:5432 on the host. API and mock service ports are internal to the Compose network.

The TLS overlay docker-compose.tls.yml adds gateway ports 80/443 and mounts deploy/nginx/certs. No cert files or TLS execution evidence were observed. Do not create or submit private keys in the evidence folder.

## Prerequisites and startup

Required: Docker Desktop with Compose v2, Node.js/npm for local development, and access to the configured payment service if using Chapa. Root package manifest uses npm workspaces. Exact installed Docker, Node, npm, and PostgreSQL versions were not collected during this inspection.

From the repository root, after creating a private local .env and replacing example secrets and host-specific values:

    docker compose up -d --build
    docker compose ps
    docker compose logs -f
    docker compose down

Use docker compose down without -v when retaining local database data. Do not use -v unless intentionally deleting the disposable local volume. The migration job runs before API replicas. Review its output and service health before testing.

The HTTP gateway endpoint is localhost:80 by default, unless GATEWAY_PORT is set. The web UI is served at the gateway root, API at /api/v1, Swagger at /api/v1/docs, liveness at /api/v1/health/live, and readiness at /api/v1/health/ready. These are configured endpoints, not confirmed running endpoints.

## Local development container dependencies

For host-based backend development with PostgreSQL in Docker, use a host-reachable DATABASE_URL (127.0.0.1:5432), not the Compose DNS host postgres. Start the database container only, then run Prisma generate, deploy migrations, seed if desired, backend and frontend commands listed in the setup guide. Keep the database on loopback.

## Environment variable reference

| Variable | Purpose | Handling |
|---|---|---|
| NODE_ENV, PORT, INSTANCE_ID | Backend runtime mode, port and instance identity | Set by Compose for containers; do not expose debug output publicly. |
| GATEWAY_PORT, GATEWAY_HTTP_PORT, GATEWAY_HTTPS_PORT | Host port bindings | Choose unused ports and confirm firewall scope. |
| POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD | Database bootstrap owner | Unique local secret; never commit actual values. |
| POSTGRES_APP_USER, POSTGRES_APP_PASSWORD | Restricted application account | Use for runtime DATABASE_URL. |
| DATABASE_URL | Prisma connection | Use Compose hostname postgres inside containers, loopback from host. Treat full value as secret. |
| JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION_DAYS | Authentication signing and expiry | Generate unique random values; do not reuse sample defaults. |
| CORS_ORIGINS | Allowed browser origins | Set exact scheme/host/port for deployment; comma-separated in backend. |
| MOCK_PAYMENT_URL, MOCK_PAYMENT_PORT, MOCK_PAYMENT_API_KEY | Mock provider endpoint/configuration | Use only local/test values. |
| CHAPA_PUBLIC_KEY, CHAPA_SECRET_KEY, CHAPA_WEBHOOK_SECRET, CHAPA_API_URL, CHAPA_CALLBACK_URL, CHAPA_RETURN_URL, CHAPA_EXPECTED_MODE, CHAPA_TIMEOUT_MS, CHAPA_RECONCILE_INTERVAL_MS | Server-side Chapa initialization, callback, return, verification and polling | Secret/private and webhook values stay backend-side. Use test account and HTTPS callback in sandbox; never include values in evidence. |
| VITE_API_BASE_URL | Web API base | Build-time browser config; use relative /api/v1 behind gateway. Never put secret keys here. |
| EXPO_PUBLIC_API_URL | Mobile API URL | Public client config only; use host LAN address reachable by phone, not localhost on device. Never put secret keys here. |
| HOST_LAN_IP | Documented host-network setting | Confirm whether referenced by selected deployment flow before use. |

Use .env.example only as a key-name template. It contains dummy local defaults and is not a production secret source. The root .env was not read for this review.

## Gateway and security

deploy/nginx/nginx.conf configures JSON access logging, server token suppression, gzip and request-rate zones. conf.d/default.conf configures API and web upstreams, 10 MB request body limit, proxy timeouts, selected security headers, authentication-specific rate limiting, forwarded headers, and next-upstream failover. Backend main.ts sets CORS allow-list, validation, correlation middleware, exception filter, Swagger and selected response headers.

TLS is separated into an overlay; certificate acquisition/renewal and HSTS were not validated. Configure CORS origins for real deployment domains, review forwarded-header trust, prevent direct public access to API containers/database, and test rate limits and security headers at the actual gateway.

## CI/CD and load balancing

.github/workflows/ci.yml defines GitHub Actions jobs on pushes and pull requests to master/main, with Node 20 and 22 matrix, npm ci, format check, lint, typecheck, test and build. This is configured automation. No successful CI run was inspected. No deployment/publish workflow was found.

Nginx upstream config uses api-node-1 and api-node-2 with round robin and failure thresholds. scripts/test-load-balancer.js is a separate local process simulator which binds ports 3001, 3002 and 8088, starts Node processes, sends requests, kills/restarts one API process, then cleans up. It may conflict with running services and requires built backend/mock artifacts plus configured database; inspect dependencies and use a disposable environment before running. No result was captured.

## Health, logs, restart, upgrade and rollback

Compose health checks call API readiness, mock health, web root and gateway /health. Use docker compose ps and docker compose logs --since 10m <service> to inspect status. Gateway writes JSON access logs with upstream, status, duration and correlation identifier. Container restart policy is unless-stopped on long-lived services. No explicit automated rollback procedure exists in Compose or CI. For an upgrade, preserve a verified backup, build a candidate image, apply migrations after review, run smoke checks, and retain the prior image/tag. Roll back only with a compatible schema plan; reverse migration is not automatic.

## Limitations

No deployment endpoint, TLS proof, image build output, successful CI run, monitoring integration, alerting configuration, registry process, or rollback run was available. Do not present Compose configuration as production deployment evidence.
