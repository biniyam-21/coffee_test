# Automated Test Execution Record

Execution date: 2026-10-29 (Africa/Nairobi, UTC+03:00)
Repository revision when first test runs started: c6eb602 on main. During the runs, HEAD advanced to 69741ef on main, a commit not created by this task. The backend source was not changed by that commit. The first web-suite result overlapped the revision change and should be superseded by the post-change rerun recorded below.
Environment: Windows PowerShell, Node.js v22.14.0. npm version could not be resolved because Node/npm reported EPERM while resolving C:\Users\biniyam. No database-backed application instance was running.

## Web unit suite

Command: npm test -w @akufada/web -- --runInBand
Outcome: PASS
Result: 17 test files passed; 64 tests passed.
Warnings observed: React update was not wrapped in act() in ToastContext tests; React Router printed two future-flag notices. No failing web tests were reported.
Evidence: Output returned by the test runner during this session; a full raw log was not saved.

## Backend unit suite

Command: npm test -w @akufada/backend -- --runInBand
Outcome: FAIL
Result: 11 test suites passed, 1 failed; 63 tests passed, 2 failed.
Failing suite: apps/backend/src/orders/orders.service.spec.ts
Observed defect: both failures enter OrdersService.cancelOrder and throw TypeError reading order.payments.some because the order fixture/query result has payments undefined. One test expected a confirmed order to cancel and refund stock; another expected an IN_PREPARATION order to be rejected with BadRequestException. The TypeError prevented the expected outcomes.
Additional warning: ts-jest warned about compiling packages/shared/dist/index.js with allowJs disabled; Jest also reported a worker failed to exit gracefully.
Evidence: Test-runner summary and failure output returned during this session; a full raw log was not saved.

## Disposable PostgreSQL end-to-end setup

Command: & .\scripts\test-e2e.ps1
Outcome: BLOCKED before creating a container.
Observed reason: script reported “Docker Desktop must be running to launch the disposable PostgreSQL container.” Therefore migrations, seed/bootstrap, and database e2e tests did not run.
Evidence: PowerShell output returned during this session; no database state was changed.

## Web unit suite rerun against current HEAD

Command: npm test -w @akufada/web -- --runInBand
Revision: 69741ef on main
Outcome: PASS
Result: 17 test files passed; 64 tests passed.
Warnings observed: React update was not wrapped in act() in ToastContext tests; React Router printed two future-flag notices.
Evidence: Test-runner summary returned during this session; full raw logs were not saved.

## Scope and follow-up

No application files were changed for this documentation task. The failed cancellation tests should be fixed and rerun in a separate authorized application-code task. Start Docker Desktop, rerun the disposable E2E script, and save the full sanitized console output before treating migration, seed or database behavior as verified.
