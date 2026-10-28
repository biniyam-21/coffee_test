# Assessment Access Guide

## Endpoints

No deployed web/API URL was provided or verified. Use these local development addresses only when services are running:

| Service | Local address |
|---|---|
| Web app (Vite) | http://localhost:3000 |
| API base | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/v1/docs |
| API liveness/readiness | http://localhost:3001/api/v1/health/live and /api/v1/health/ready |
| Mock service | localhost port 4000; exact routes are documented in apps/mock-payment/src/index.ts |
| Expo Metro | exp://<host LAN IP>:8081 |
| Compose gateway | http://localhost by default, with /api/v1 and /api/v1/docs |

Replace these with actual verified URLs if deploying. The API base prefix root itself is not an API endpoint.

## Roles and access

| Role | Intended operations |
|---|---|
| CUSTOMER | Browse public menu, place orders, view own order details/history/tracking, cancel only where permitted. |
| STAFF | View kitchen queue, advance allowed order statuses, inspect inventory and operational orders. |
| ADMIN | Manage users/roles, products/prices, inventory adjustments, payment reconciliation, reports and audit events; staff operations also available. |

The authorization source is backend roles guards/controllers. The visual navigation is not proof of access control.

## Accounts

The seed source defines synthetic development/demo users with fixed passwords. Do not publish or reuse those credentials for a deployed assessment instance. For an isolated local database, inspect the seed implementation and use those accounts only for local demonstration. For a shared environment, candidate must securely create separate sanitized assessment accounts through the supported registration/admin workflow, set unique temporary passwords, distribute them to the assessor through an approved channel, and rotate or disable them afterward. No working assessment account was verified here.

Public registration creates a customer role. Staff/admin roles require an authorized admin role assignment or controlled bootstrap; never expose an unauthenticated admin bootstrap endpoint.

## Mobile access

Run the mobile app with Expo using the setup guide. Configure EXPO_PUBLIC_API_URL with the development computer's reachable LAN IP and API/gateway port. Record actual physical device manufacturer/model, OS version, Expo Go version and network. None was available during this inspection.

## Safe data preparation

Use a newly created disposable assessment database and synthetic seed records. Avoid live customer data and production credentials. Do not reset a database containing data you need. If a fresh dataset is needed, create a new database and point a private .env to it, then apply migrations and seed. The seed script rejects NODE_ENV=production and includes fixed demo account credentials; do not run it on public production infrastructure.

## Candidate completion fields

- Deployed web URL: TO BE COMPLETED BY CANDIDATE.
- Backend API URL: TO BE COMPLETED BY CANDIDATE.
- Swagger URL: TO BE COMPLETED BY CANDIDATE.
- Mobile installation/demo instructions and physical device: TO BE COMPLETED BY CANDIDATE.
- Sanitized test account handoff procedure: TO BE COMPLETED BY CANDIDATE.
- Local fallback steps: follow 03-clean-setup-guide.md.
