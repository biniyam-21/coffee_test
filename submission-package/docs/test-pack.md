# Test Pack

## Objectives and scope

This plan covers the assessment's functional, negative, authorization, API, database integrity, duplicate request, concurrency, external failure, security, load balancing, backup/restore, upgrade/rollback and mobile requirements. On 2026-10-29, the web and backend unit suites were executed. The web suite passed; the backend suite had two cancellation-related failures. The disposable PostgreSQL E2E script was attempted but Docker Desktop was not running. Other results remain NOT RUN until the candidate records real output.

## Environment and prerequisites

- Use only synthetic records and a disposable PostgreSQL instance.
- For scripts/test-e2e.ps1, Docker Desktop must be available. It starts a temporary PostgreSQL container on loopback port 55432 by default and removes the container in a finally block.
- Inspect ports before running any test script. Never point destructive test or restore commands at a valuable database.
- For Chapa, use sandbox credentials and a working HTTPS callback. Never copy credential values into test output.
- Record local date/time, OS, Node/npm/PostgreSQL/Docker versions, git commit, command, exit code, sanitized output and evidence file.

## Test cases

| ID | Requirement | Preconditions and steps | Expected result | Actual / status / evidence |
|---|---|---|---|---|
| T-01 | Registration | Disposable DB; submit valid new synthetic customer | Created customer, hashed password, customer role | NOT RUN; EVIDENCE REQUIRED |
| T-02 | Invalid sign-in | Use incorrect password for test account | Generic authentication rejection; no token | NOT RUN; EVIDENCE REQUIRED |
| T-03 | Refresh/logout | Sign in, rotate refresh token, log out, retry revoked token | New pair on valid rotation; revoked refresh rejected | NOT RUN; EVIDENCE REQUIRED |
| T-04 | Menu and search | Query products/categories with valid and invalid paging | Correct filtered page; invalid query rejected | NOT RUN; EVIDENCE REQUIRED |
| T-05 | Order success | Seeded synthetic catalog and customer; POST order | Server-calculated totals and persisted order/payment state | NOT RUN; EVIDENCE REQUIRED |
| T-06 | Stock validation | Request unavailable/oversized quantity | Controlled error, no negative inventory | NOT RUN; EVIDENCE REQUIRED |
| T-07 | Duplicate idempotency | Submit same header/body twice; then same key with altered body | Replay cached result; mismatched hash rejected | NOT RUN; EVIDENCE REQUIRED |
| T-08 | Concurrent stock | Concurrently order the last available units | No oversell; transaction/movement balances reconcile | NOT RUN; EVIDENCE REQUIRED |
| T-09 | Order access control | Customer A reads customer B's order | 403 or non-disclosing not-found as implemented; no data leak | NOT RUN; EVIDENCE REQUIRED |
| T-10 | Staff lifecycle | Staff reads queue and performs legal/illegal transitions | Legal transition persists; illegal transition rejected | NOT RUN; EVIDENCE REQUIRED |
| T-11 | Admin boundaries | Customer/staff tries admin product/user/stock/report routes | Unauthorized role receives 403 | NOT RUN; EVIDENCE REQUIRED |
| T-12 | Admin inventory | Admin restock and attempt negative resulting stock | Ledger entry for valid change; invalid change rejected | NOT RUN; EVIDENCE REQUIRED |
| T-13 | Validation and error envelope | Send malformed UUID, invalid enum and unknown body field | 400 with standardized error; no invalid record | NOT RUN; EVIDENCE REQUIRED |
| T-14 | Request-size limit | Send payload above 10 MB through Nginx | Gateway rejects oversized body | NOT RUN; EVIDENCE REQUIRED |
| T-15 | External mock success/decline | Start mock service and submit each supported outcome | Correct payment and order state for selected simulation | NOT RUN; EVIDENCE REQUIRED |
| T-16 | External timeout/failure | Cause controlled unavailable/timeout response | Bounded timeout/retries, controlled error, correlation ID | NOT RUN; EVIDENCE REQUIRED |
| T-17 | Chapa initialization | Use sandbox secret and HTTPS callback; place Chapa order | Checkout URL returned and pending payment recorded | NOT RUN; EVIDENCE REQUIRED |
| T-18 | Chapa verify/webhook | Complete sandbox payment; test valid and invalid signature | Server verification updates once; bad signature changes nothing | NOT RUN; EVIDENCE REQUIRED |
| T-19 | Chapa reconciliation | Leave a pending sandbox transaction then invoke reconcile | Verified state converges; repeated run remains idempotent | NOT RUN; EVIDENCE REQUIRED |
| T-20 | CORS/security headers | Test allowed/disallowed browser origin and response headers through gateway | Allowed origin only; configured headers present | NOT RUN; EVIDENCE REQUIRED |
| T-21 | Health/readiness | Query live and ready with healthy and unavailable DB | Live reports process; readiness reflects dependency state | NOT RUN; EVIDENCE REQUIRED |
| T-22 | Migrations/seed | Run disposable PostgreSQL script from clean empty DB | Generate, migrate, seed and e2e complete with genuine output | BLOCKED: Docker Desktop was not running; EVIDENCE REQUIRED |
| T-23 | Backup/restore | Run test-backup-restore.ps1 against disposable Compose DB | Restore counts equal source; disposable target removed | NOT RUN; EVIDENCE REQUIRED |
| T-24 | Load distribution/failover | Run load-balancer demo after reviewing port and DB prerequisites | Requests reach both nodes; surviving node handles requests during failure | NOT RUN; EVIDENCE REQUIRED |
| T-25 | Upgrade/rollback | Snapshot disposable stack; apply candidate update; verify rollback path | App returns to supported prior version with data integrity | NOT RUN; EVIDENCE REQUIRED |
| T-26 | Mobile physical device | Sign in, place/order-track, trigger an error on actual phone | Principal flow and useful failure state; API reachable over LAN | NOT RUN; BLOCKED until device available |
| T-27 | Audit/report | Admin queries audit and sales report after synthetic transaction | Correct role restriction and expected aggregate/event | NOT RUN; EVIDENCE REQUIRED |
| T-28a | Backend unit suite | npm test -w @akufada/backend -- --runInBand | All backend unit tests pass | FAILED: 11 suites passed, 1 failed; 63 tests passed, 2 failed; cancelOrder throws TypeError reading order.payments.some when payments is undefined. See evidence/automated-tests/2026-10-29-unit-test-run.md. |
| T-28b | Web unit suite | npm test -w @akufada/web -- --runInBand | All web tests pass | PASS at HEAD 69741ef: 17 suites, 64 tests. React act() and React Router future-flag warnings were emitted; see evidence/automated-tests/2026-10-29-unit-test-run.md. |
| T-28c | Mobile and shared unit suites | Run the package test scripts | All mobile/shared tests pass | NOT RUN; EVIDENCE REQUIRED |

## Existing test assets

Unit test files are under apps/backend/src, apps/web/src, apps/mobile/src and packages/shared/src. Backend database e2e specs are under apps/backend/test. Root CI runs format check, lint, typecheck, tests and build for Node 20/22. scripts/test-e2e.ps1 provisions temporary PostgreSQL; scripts/test-backup-restore.ps1 tests a restored disposable database; scripts/test-load-balancer.js simulates two backend instances. Presence is not a pass result.

## Defects and unresolved quality risks

The backend cancellation tests expose a defect in the current implementation: cancelOrder assumes order.payments is always an array, but the affected test fixture/query result has payments undefined. It raises TypeError before returning the intended business error. This package did not modify the application. Physical device, TLS, external sandbox, restore, load balancing, monitoring and rollback demonstrations remain evidence-required. Review test scripts for port collisions and ensure Docker and disposable DB behavior before execution.

## Regression strategy

Run the CI-equivalent checks against the exact release commit; run database e2e against a disposable instance; repeat role, order/idempotency, stock concurrency and payment verification tests after changes to those modules. Preserve command output with commit and environment metadata. Do not edit output to convert failures into passes.
