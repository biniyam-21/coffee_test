# Live Demonstration Guide

This rehearsal follows the assessment's ten required steps in order. It is a preparation guide, not a record of a demonstration. At package creation, no live demonstration evidence was available. Use a disposable seeded database, synthetic identities and the exact commit/tag being submitted.

## 1. Release, architecture and deployment

**Objective:** Identify the release and explain technology, boundaries and topology.  
**Preconditions:** Final reviewed commit and tag, architecture diagram, running environment.  
**Actions:** Show git tag and git rev-parse HEAD; show architecture pack and actual Compose service inventory. Explain browser/mobile trust boundary, API validation/roles, single PostgreSQL primary and payment provider boundary.  
**Expected observation:** Tag resolves to demonstrated commit; services and ports match running setup.  
**Evidence:** EVIDENCE REQUIRED under evidence/release and deployment.  
**Failure checks:** Missing tag, mismatch between Compose and live services, API version mismatch.  
**Likely question:** Why a modular monolith? Explain shared transactional business rules and deployment scope; distinguish the mock payment process from backend modules.

## 2. Repository, history, reviews, checks and secret exclusion

**Objective:** Show traceable development and clean secret handling.  
**Preconditions:** Remote access, all relevant branches, PR evidence, CI run, release notes.  
**Actions:** Show git log, git branch -a, tag, actual PR/review records, CI results, .gitignore and secret scan. The current inspected checkout had one local branch, no tags, and pre-existing modified web files; explain changes made before final release.  
**Expected observation:** Candidate can identify change rationale and evidence; .env is excluded and no real credentials are tracked.  
**Evidence:** EVIDENCE REQUIRED.  
**Failure checks:** Untagged submission, dirty worktree, no review evidence, credential leak.  
**Likely question:** How do you know secrets are excluded? Explain .gitignore and show a safe scan of tracked files without printing environment values.

## 3. Authentication and role boundaries

**Objective:** Show valid and invalid sign-in, role-specific views and server-side denial.  
**Preconditions:** Isolated seeded/sanitized customer, staff and admin accounts; browser and API docs.  
**Actions:** Sign in as each role, submit a wrong password, then call a protected admin route as customer and staff.  
**Expected observation:** Valid sign-in works; invalid credentials are denied; backend rejects unauthorized roles even if UI is bypassed.  
**Evidence:** EVIDENCE REQUIRED under api-tests/security and sanitized screenshots.  
**Failure checks:** Demo seed credentials publicly accessible, stale token, client-only role hiding.  
**Likely question:** How is role enforcement applied? Describe JWT guard, roles metadata/guard and controller-level rules.

## 4. Complete web order and staff action

**Objective:** Place one principal order and show kitchen fulfillment.  
**Preconditions:** Synthetic products with stock, customer and staff sessions, chosen payment provider ready.  
**Actions:** Browse/search, add product, enter notes, choose cash/mock or sandbox Chapa, submit once; open staff queue, move through valid states, return to customer tracking/history.  
**Expected observation:** Server prices items, order is persisted, stock movement reflects reservation, staff action is recorded and customer timeline updates. For Chapa, verify server-side status before describing payment as successful.  
**Evidence:** EVIDENCE REQUIRED.  
**Failure checks:** Duplicate clicks, stock shortage, provider outage, stale queue, mismatch between payment/order state.  
**Likely question:** How do you avoid charging twice? Explain optional Idempotency-Key plus unique DB key, and provider transaction verification.

## 5. API success and negative cases

**Objective:** Demonstrate successful, invalid, unauthorized, duplicate, oversized and provider failure requests.  
**Preconditions:** Swagger/API base, role tokens held privately, Nginx path for size test, mock provider.  
**Actions:** Run one successful read/order; invalid DTO; protected route without/with insufficient role; same idempotency key twice and altered payload; request above 10 MB through gateway; mock provider unavailable or timeout.  
**Expected observation:** Appropriate 2xx/4xx/5xx result, standardized error and correlation ID; no duplicate order or negative stock. Actual status must be observed, not assumed.  
**Evidence:** EVIDENCE REQUIRED under api-tests.  
**Failure checks:** Tests sent to real DB/provider, token appears in logs, oversized body sent directly to API bypassing gateway.  
**Likely question:** Which layer owns body limit? Nginx defines 10 MB gateway limit; test the path through that gateway.

## 6. Load balancing and continuity

**Objective:** Show requests distributed or service available after one node stops.  
**Preconditions:** Isolated DB, free ports 3001, 3002, 8088, built services; inspect scripts/test-load-balancer.js before running.  
**Actions:** Run the scripted demo only in a disposable environment; capture X-Backend-Instance IDs before, during one process failure and after restart. Alternatively demonstrate Compose/Nginx if actually running.  
**Expected observation:** Both instance IDs serve requests and surviving instance responds during simulated failure.  
**Evidence:** EVIDENCE REQUIRED; script presence is not a pass.  
**Failure checks:** Port conflict, missing dist output, wrong DATABASE_URL, static simulator evidence confused with Nginx deployment.  
**Likely question:** Is this high availability? Explain two API processes with one shared database; database failover is not configured.

## 7. Database, backup, restore and recovery

**Objective:** Show DB health, schema state and safe backup restoration; explain replication status.  
**Preconditions:** Disposable DB, pg tools or Docker, verified backup.  
**Actions:** Show PostgreSQL version, migrations and synthetic records; run scripts/test-backup-restore.ps1 only against isolated Compose DB. Show count comparison and cleanup. Explain that no replica is configured.  
**Expected observation:** Restore target counts match; original remains unchanged.  
**Evidence:** EVIDENCE REQUIRED under database and backup-restore.  
**Failure checks:** Running destructive restore.ps1 against valued database, leaking dump, running against production.  
**Likely question:** What is the recovery point? RPO/RTO are not defined; candidate must describe measured backup schedule and recovery objective only if established.

## 8. Physical mobile demonstration

**Objective:** Show mobile authentication, one principal transaction and an error.  
**Preconditions:** Physical phone, Expo-compatible app setup, LAN-reachable API, sanitized account.  
**Actions:** Record device/OS, launch via Expo Go, sign in, browse and order, show tracking, then demonstrate controlled network/provider failure.  
**Expected observation:** Mobile uses same secured API, bearer auth and SecureStore token utility; order and failure state are visible.  
**Evidence:** EVIDENCE REQUIRED under mobile.  
**Failure checks:** EXPO_PUBLIC_API_URL uses localhost; phone not on reachable network; emulator presented as physical device.  
**Likely question:** Where are tokens stored? Explain mobile secure-session uses expo-secure-store; do not claim hardware guarantees beyond platform API.

## 9. Deployment, configuration, health, logs and rollback

**Objective:** Show deployment configuration and operational controls.  
**Preconditions:** Actual Docker environment, externalized private env, TLS certs if HTTPS, backup and previous image.  
**Actions:** Show Compose services and health, verify CORS/security headers at gateway, show JSON access log/correlation, perform documented upgrade/restart and rehearsed rollback.  
**Expected observation:** Actual service health and configuration match docs. No monitoring/alerting system was found in source; state that accurately and show probes/logs as available signals.  
**Evidence:** EVIDENCE REQUIRED under deployment/monitoring.  
**Failure checks:** No TLS certificate, overly broad CORS, migration incompatible with rollback, secret in terminal output.  
**Likely question:** Does image rollback reverse a migration? No; requires backward-compatible schema or a separate DB recovery/forward-fix plan.

## 10. Technical defense and reproducibility

**Objective:** Answer questions and reproduce a result chosen by assessor.  
**Preconditions:** Candidate has reviewed every pack, source, gaps and evidence.  
**Actions:** Use question bank in docs/technical-defense-question-bank.md; reproduce a request/test from clean setup without relying on fabricated output.  
**Expected observation:** Explanation matches source and observed result; gaps are acknowledged plainly.  
**Evidence:** EVIDENCE REQUIRED for rehearsal notes and any assessor-selected run.  
**Failure checks:** Claiming unrun tests, forgetting exact release commit, disclosing credentials.  
**Likely question:** Which claims are verified? Distinguish source/configuration evidence from runtime outputs and be explicit about what was not run.
