# Coffee Shop Order Management System (Akufada)

An enterprise-grade, multi-client Coffee Shop Order Management System designed for a software engineering practical examination.

## System Overview

- **Web Frontend:** React 18, Vite, TypeScript, Responsive UI with Purple primary accent (`#7C3AED`).
- **Mobile Client:** React Native with Expo SDK 51, TypeScript, LAN IP physical-device connectivity conventions.
- **Backend API:** NestJS 10, TypeScript, REST API versioned under `/api/v1`, RFC 7807 problem details, correlation ID tracking (`X-Correlation-ID`), instance header (`X-Backend-Instance`).
- **Shared Contracts:** `@akufada/shared` pure TypeScript package containing shared domain enums and DTO interfaces.
- **External Integration:** `@akufada/mock-payment` standalone Express service simulating external payment gateway outcomes (`SUCCESS`, `DECLINED`, `TIMEOUT`).
- **Quality Gates:** ESLint, Prettier, TypeScript strict type checking, Jest & Vitest automated test suites, GitHub Actions CI.

---

## Quickstart & Commands

### Prerequisites

- Node.js >= 20.11.0 LTS (Tested on Node.js v22.14.0)
- npm >= 10.0.0
- Git >= 2.40.0

### Installation

```bash
# 1. Clone repository and setup environment
cp .env.example .env

# 2. Install monorepo dependencies
npm install

# 3. Build shared contracts package
npm run build:shared
```

### Local Development Commands

```bash
# Run NestJS Backend API (http://localhost:3001/api/v1)
npm run dev:backend

# Run Web Client with Vite HMR (http://localhost:3000)
npm run dev:web

# Run Mobile Client with Expo Metro (exp://<LAN_IP>:8081)
npm run dev:mobile

# Run Mock External Payment Service (http://localhost:4000)
npm run dev:mock
```

### Automated Quality Gates

```bash
# Run all quality checks sequentially (lint -> format -> typecheck -> test -> build)
npm run check

# Individual quality gates
npm run lint          # Static code analysis
npm run format:check # Prettier code style check
npm run typecheck    # Strict TypeScript compiler verification
npm run test         # Unit & component test suites (14 tests)
npm run test:e2e     # Backend Supertest E2E integration tests (2 tests)
npm run build        # Compile production bundles
```

---

## Documentation Index

### Phase 1: Technical Architecture & Planning

All Phase 1 specifications are available in [`docs/phase-1/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1):

1. [`01-requirements.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/01-requirements.md) - Requirements Specification & Traceability Matrix
2. [`02-architecture.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/02-architecture.md) - System Architecture & Technical Design
3. [`03-data-model.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/03-data-model.md) - Relational Data Model & Database Architecture
4. [`04-api-contract.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/04-api-contract.md) - REST API Specification & Contract Design (`/api/v1`)
5. [`05-security-threat-model.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/05-security-threat-model.md) - Security Architecture, Threat Model & STRIDE Register
6. [`06-repository-structure.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/06-repository-structure.md) - Repository Structure & Engineering Workflow
7. [`07-implementation-backlog.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/07-implementation-backlog.md) - Phased Implementation Backlog & Delivery Plan
8. [`08-service-inventory.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/08-service-inventory.md) - Service Inventory & Network Topology
9. [`09-deployment-plan.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/09-deployment-plan.md) - Local Deployment Plan, Runbooks & Disaster Recovery
10. [`10-phase-1-review.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/10-phase-1-review.md) - Phase 1 Technical Review, Audit & Compliance Signoff
11. [`role-perspectives.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-1/role-perspectives.md) - Phase 1 Multi-Role Architectural Evaluations

### Phase 2: Repository Foundation & Engineering Quality Gates

All Phase 2 runbooks and verification reports are available in [`docs/phase-2/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2):

1. [`01-repository-foundation.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2/01-repository-foundation.md) - Repository Layout & Package Boundaries
2. [`02-development-setup.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2/02-development-setup.md) - Development Setup & Runbook
3. [`03-quality-gates-and-ci.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2/03-quality-gates-and-ci.md) - Quality Gates & Continuous Integration
4. [`04-phase-2-verification-report.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2/04-phase-2-verification-report.md) - Quality Gate Results & Operational Verification
5. [`role-perspectives.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-2/role-perspectives.md) - Phase 2 Multi-Role Implementation Assessments

### Phase 3: Database Architecture, Migrations & Concurrency Controls

All Phase 3 specifications, runbooks, and verification reports are available in [`docs/phase-3/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3):

1. [`01-database-implementation.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/01-database-implementation.md) - Relational Data Architecture, Models & Invariants
2. [`02-prisma-and-migrations.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/02-prisma-and-migrations.md) - Prisma Schema, Migration Strategy & Seed Data
3. [`03-database-testing.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/03-database-testing.md) - Schema Integrity, Concurrency & Idempotency Testing
4. [`04-backup-and-restore.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/04-backup-and-restore.md) - Backup, Restore & Recovery Runbooks
5. [`05-phase-3-verification-report.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/05-phase-3-verification-report.md) - Phase 3 Verification Report & Quality Results
6. [`role-perspectives.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-3/role-perspectives.md) - Phase 3 Multi-Role Engineering Sign-Offs

### Phase 4: Secure Backend API, Core Business Logic & Operations

All Phase 4 specifications, runbooks, and verification reports are available in [`docs/phase-4/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4):

1. [`01-backend-implementation.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/01-backend-implementation.md) - Backend Architecture, Modules & REST Endpoints
2. [`02-authentication-and-authorization.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/02-authentication-and-authorization.md) - Bcrypt Hashing, Token Rotation & RBAC
3. [`03-business-rules-and-transactions.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/03-business-rules-and-transactions.md) - Authoritative Pricing, Row-Locking & State Machine
4. [`04-api-documentation-and-testing.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/04-api-documentation-and-testing.md) - Swagger OpenAPI & Automated Test Suites
5. [`05-phase-4-verification-report.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/05-phase-4-verification-report.md) - Phase 4 Verification & Quality Gate Results
6. [`role-perspectives.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-4/role-perspectives.md) - Phase 4 Multi-Role Engineering Sign-Offs

### Phase 5: Responsive Web Application & Role-Based Workflows

All Phase 5 specifications, runbooks, and verification reports are available in [`docs/phase-5/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5):

1. [`00-implementation-plan.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/00-implementation-plan.md) - Web Application Architecture & Roadmap
2. [`01-design-system-and-branding.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/01-design-system-and-branding.md) - Purple Brand Design Tokens, Typography & Components
3. [`02-routing-and-pages.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/02-routing-and-pages.md) - Route Structure & Page Hierarchies
4. [`03-api-integration.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/03-api-integration.md) - Typed API Client & Error Normalization
5. [`04-authentication-and-session.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/04-authentication-and-session.md) - Token Refresh & Role-Based Access Control
6. [`05-accessibility-and-usability.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/05-accessibility-and-usability.md) - WCAG 2.1 AA Compliance Audit
7. [`06-testing-results.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/06-testing-results.md) - Vitest Unit & Component Test Evidence
8. [`07-known-limitations.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/07-known-limitations.md) - Documented Scope Boundaries & Constraints
9. [`08-phase-review.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-5/08-phase-review.md) - Phase 5 Audit Sign-Off

### Phase 6: React Native Mobile Application & Secure Storage

All Phase 6 specifications, runbooks, and verification reports are available in [`docs/phase-6/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6):

1. [`00-implementation-plan.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/00-implementation-plan.md) - Mobile Roadmap & Expo SDK 51 Setup
2. [`01-mobile-architecture.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/01-mobile-architecture.md) - Architecture, Domain Contexts & KeyStore Security
3. [`02-navigation-and-screens.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/02-navigation-and-screens.md) - Screen Flows & Bottom-Tab Navigation
4. [`03-api-integration.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/03-api-integration.md) - Typed API Client with Idempotency Key Injection
5. [`04-authentication-and-security.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/04-authentication-and-security.md) - Hardware Token Persistence via `expo-secure-store`
6. [`05-local-development.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/05-local-development.md) - Expo Go, Android Emulator & iOS Simulator Runbook
7. [`06-testing-results.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/06-testing-results.md) - Mobile Jest Test Suites Verification
8. [`07-known-limitations.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/07-known-limitations.md) - Push Notifications & Offline Constraints
9. [`08-phase-review.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-6/08-phase-review.md) - Phase 6 Sign-Off

### Phase 7: System Integration, Docker Deployment & Disaster Recovery

All Phase 7 specifications, runbooks, and verification reports are available in [`docs/phase-7/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7):

1. [`00-implementation-plan.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/00-implementation-plan.md) - Phase 7 Comprehensive Implementation Plan
2. [`01-deployment-architecture.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/01-deployment-architecture.md) - Production Topology, Ports & Security Boundaries
3. [`02-docker-and-compose.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/02-docker-and-compose.md) - Multi-Stage Dockerfiles & Compose Orchestration
4. [`03-nginx-gateway-and-load-balancing.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/03-nginx-gateway-and-load-balancing.md) - Upstream Round-Robin, Rate Limiting & Failover
5. [`04-external-service-resilience.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/04-external-service-resilience.md) - Mock Payment Client, Chaos Testing & Retries
6. [`05-database-backup-and-restore.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/05-database-backup-and-restore.md) - Verified Backup & Disposable Restore Runbooks
7. [`06-test-plan-and-results.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/06-test-plan-and-results.md) - Monorepo Quality Gates & Test Suite Matrix (111 tests)
8. [`07-logging-monitoring-and-alerts.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/07-logging-monitoring-and-alerts.md) - Structured JSON Logs, Health Probes & Alerting
9. [`08-upgrade-and-rollback.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/08-upgrade-and-rollback.md) - Rolling Deployments & Disaster Recovery Runbooks
10. [`09-troubleshooting-runbook.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/09-troubleshooting-runbook.md) - Diagnostic Decision Tree & Incident Runbooks
11. [`10-phase-review.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-7/10-phase-review.md) - Phase 7 Engineering Audit & Compliance Sign-Off

### Phase 8: Release, Verification & Technical Defense (Final 10%)

All Phase 8 release documentation, verification logs, and defense runbooks are available in [`docs/phase-8/`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8):

1. [`00-release-and-defense-master-plan.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/00-release-and-defense-master-plan.md) - Master Release & Defense Framework
2. [`01-clean-environment-setup-verification.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/01-clean-environment-setup-verification.md) - Clean Environment Setup & Verification Runbook
3. [`02-full-test-suite-and-verification.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/02-full-test-suite-and-verification.md) - Full Quality Suite Execution & Measured Results (111 tests)
4. [`03-examination-cover-sheet.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/03-examination-cover-sheet.md) - Examination Cover Sheet & Disclosed Assistance Statement
5. [`04-artifact-pack-and-deliverables-manifest.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/04-artifact-pack-and-deliverables-manifest.md) - Deliverables Manifest & Structural Inventory
6. [`05-known-limitations-and-tradeoffs.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/05-known-limitations-and-tradeoffs.md) - Known Limitations & Architectural Trade-offs
7. [`06-release-tag-and-git-provenance.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/06-release-tag-and-git-provenance.md) - Semantic Release Tagging & Commit Provenance (`v1.0.0-final`)
8. [`07-demonstration-script-and-rehearsal.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/07-demonstration-script-and-rehearsal.md) - 10-Minute Viva Demonstration Script & Rehearsal
9. [`08-technical-defense-qa.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/08-technical-defense-qa.md) - 25 Comprehensive Technical Defense Questions & Answers
10. [`09-phase-review.md`](file:///c:/Users/biniyam/Desktop/Akufada/docs/phase-8/09-phase-review.md) - Phase 8 Final Release Sign-Off Certificate

---

## Phase 7 Operational Commands

### 1. Multi-Instance Load Balancing & Failover Demonstration

```bash
# Execute automated dual-replica cluster test with round-robin verification and simulated failover
node scripts/test-load-balancer.js
```

### 2. Database Disaster Recovery Runbooks

```powershell
# Create physical compressed backup dump
powershell.exe -ExecutionPolicy Bypass -File ./scripts/backup.ps1 -OutputDir "./backups"

# Restore backup into disposable test database (akufada_restore_test) and verify row parity
powershell.exe -ExecutionPolicy Bypass -File ./scripts/restore.ps1 `
  -BackupFile (Get-Item .\backups\akufada_backup_*.dump | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName `
  -RestoreTargetDb "akufada_restore_test"
```

### 3. Docker Compose Orchestration (Production Stack)

```bash
# Build production images and start full stack in detached mode
docker compose up -d --build

# Inspect running cluster health probes
docker compose ps
```

## Backend API and Payments

- [Versioned API endpoint inventory and local smoke flow](docs/backend-api.md)
- [Chapa hosted checkout integration guide](docs/chapa-payment-integration.md)
- Swagger UI: `/api/v1/docs`

### Payment and production verification

- Run the backend unit suite with `npm test -w @akufada/backend -- --runInBand`.
- Once Docker Desktop is running, run the isolated disposable-PostgreSQL migration, seed, and end-to-end checks with `./scripts/test-e2e.ps1`.
- Run the live-database backup/restore drill with `./scripts/test-backup-restore.ps1`; it restores to a disposable database and compares core table counts.
- For TLS, provision a valid certificate and place `fullchain.pem` and `privkey.pem` in `deploy/nginx/certs/`. Configure `CORS_ORIGINS` to the exact production web origin, set Chapa callback/return URLs to the HTTPS domain, then start with `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build`.
- Keep `CHAPA_EXPECTED_MODE=test` until sandbox checkout, callback, webhook, reconciliation, failure recovery, migration, and restore drills all pass. Configure production TLS, CORS, Chapa live secret/webhook keys, and rollback/backup monitoring before switching to `live`.
