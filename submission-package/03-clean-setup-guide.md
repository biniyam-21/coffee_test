# Clean Setup Guide

This procedure is intended for an isolated assessment machine and synthetic data. It describes repository commands found in package manifests, app configuration and scripts. It has not been executed end-to-end during package preparation; verify each step and save evidence before submission.

## 1. Prerequisites

- Windows 10/11, PowerShell, Git, Node.js 20 or 22 and npm (the CI matrix is Node 20.x/22.x).
- Docker Desktop with Compose v2 for PostgreSQL or full Compose deployment.
- A web browser. For mobile, Expo Go compatible with the SDK in the current mobile app; Expo SDK 58 is declared in apps/mobile/package.json.
- A Chapa sandbox account only if demonstrating hosted payment. Payment provider testing is optional for the non-Chapa payment selections.
- PostgreSQL 16 is the Compose image. A local PostgreSQL installation may be used if its version and connection parameters are recorded.

Verify tool versions:

    node --version
    npm --version
    docker --version
    docker compose version
    git --version

Record actual output; do not copy expected versions as if observed.

## 2. Obtain the repository

Candidate must provide the correct remote URL or approved repository bundle. No remote URL was verified in this inspection.

    git clone <candidate repository URL>
    cd <repository folder>
    git checkout <reviewed release tag or commit>

Preserve full history. Check git status, git log and git tag before setup.

## 3. Install dependencies

From the repository root:

    npm ci

The package scripts use npm workspaces. A working network and registry access are required. This command has not been run for this guide.

## 4. Configure environment

For a clean checkout:

    Copy-Item .env.example .env

Edit .env locally. Replace every sample password, JWT key, payment key and callback URL with unique test-only values. Do not commit .env or paste secret values into evidence. The example environment contains Docker-oriented database host postgres; if running backend on the host, change DATABASE_URL to use 127.0.0.1 and the mapped database port. For Docker API containers, the Compose service hostname postgres is correct.

For full Compose startup, configure required values in the private .env before running Compose. Set CORS_ORIGINS to exact web origin(s). For a phone, set EXPO_PUBLIC_API_URL to a URL using the computer's LAN IPv4 address; localhost on the handset refers to the handset. Never put Chapa private or webhook keys in VITE_API_BASE_URL or EXPO_PUBLIC_API_URL.

Chapa test mode requires server-side CHAPA_SECRET_KEY (active private key for test mode), public identifier if used, webhook secret as configured, API base URL, reachable HTTPS callback URL, return URL, and expected mode test. Keep credentials outside this guide and source control. Do not configure real payment credentials for this exercise.

## 5. Start PostgreSQL and migrate

For host-based application processes with Docker PostgreSQL:

    docker compose up -d postgres
    docker compose ps postgres
    npm run prisma:generate
    npm run prisma:deploy

Confirm PostgreSQL is healthy before migrations. These commands target the database in DATABASE_URL. Use only a clean disposable assessment database. The migration deploy command applies the committed Prisma migrations; it does not reset the database.

## 6. Seed synthetic data

Optional for a new assessment database:

    npm run prisma:seed

The seed script is idempotent for roles, synthetic demo users, categories and products. It contains fixed demonstration identities/passwords in source, so run it only in an isolated local assessment database. Do not expose those accounts to a public deployment; change credentials or create separate assessment accounts using approved procedures before any shared environment. It refuses to run when NODE_ENV=production.

## 7. Start local services

Open separate PowerShell terminals at the repository root:

    npm run dev:backend

    npm run dev:web

Optional mock service:

    npm run dev:mock

The web Vite server listens on port 3000 and proxies /api/v1 to localhost:3001 as configured. The backend defaults to 3001. Mock service defaults to port 4000. Check the terminal startup output and avoid port collisions.

## 8. Mobile setup

Set EXPO_PUBLIC_API_URL to the backend/gateway URL reachable from the device. Find the host's IPv4 address with ipconfig. Ensure phone and host share a reachable network and that firewall policy allows the API port. Then run:

    npm run dev:mobile

Scan the Expo QR using Expo Go. Mobile configuration and actual device compatibility should be confirmed with the currently installed Expo Go version. Physical-device authentication and order demonstration are required by the assessment and have not been verified here.

## 9. Docker deployment mode

With the private environment configured:

    docker compose up -d --build
    docker compose ps
    docker compose logs --since 10m

The stack includes gateway, web, two backend instances, mock payment service, migration job and PostgreSQL. The gateway serves the app on GATEWAY_PORT (default 80). The backend API and Swagger are routed below /api/v1. TLS overlay example:

    docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build

This overlay requires valid certificates at the configured mount path, which are not supplied. Do not run the TLS command until certificates and deployment DNS are prepared. No Docker build has been verified for this package.

## 10. Health and endpoint checks

After services are running, open:

- Web: http://localhost:3000 for local Vite, or http://localhost/ for default gateway.
- API docs: http://localhost:3001/api/v1/docs locally, or http://localhost/api/v1/docs through default gateway.
- Liveness: http://localhost:3001/api/v1/health/live.
- Readiness: http://localhost:3001/api/v1/health/ready.
- Gateway health: http://localhost/health when Compose gateway is serving port 80.

The bare API prefix http://localhost:3001/api/v1 is not a documented root route and can return 404. Verify endpoint behavior rather than expecting a response at that root.

## 11. Automated checks

Package scripts define:

    npm run format:check
    npm run lint
    npm run typecheck
    npm test
    npm run build

The CI workflow runs these checks for Node 20 and 22. Backend DB e2e uses:

    ./scripts/test-e2e.ps1

That script requires Docker and uses a disposable PostgreSQL container bound to 127.0.0.1:55432 by default. Check the port first. It generates Prisma Client, deploys migrations, seeds, runs backend e2e tests, and removes the temporary container in a finally block. Save actual output and exit code. No test command was run for this setup guide.

## 12. Troubleshooting

- Prisma cannot connect: check database health and host name for process location (Compose DNS for containers, loopback for host).
- Migration reports schema drift: stop; verify correct clean assessment DB and migration history. Do not reset a valued database.
- Browser CORS error: set exact CORS_ORIGINS to the scheme/host/port of the web client and restart backend.
- Swagger 404: use /api/v1/docs; do not use the bare /api/v1 root.
- Payment initialization error: confirm sandbox private key is active, mode matches CHAPA_EXPECTED_MODE, callback is HTTPS and reachable, then inspect sanitized server logs with correlation ID.
- Mobile API unavailable: replace localhost with computer LAN IP and verify phone network/firewall.
- Port already bound: identify the existing process and choose a documented free host port; do not kill an unknown process.

## 13. Cleanup

Stop local processes with Ctrl+C. Stop Compose while preserving data with docker compose down. For disposable e2e containers, the script performs cleanup. Do not add -v or drop a database unless its disposable status has been verified and data deletion is intended.
