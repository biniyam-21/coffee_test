# Akufada Assessment Submission Package

This package maps the Coffee Shop Order Management assessment to the implementation in this repository. It separates source-backed implementation from behavior that has been run and observed. Inspection began at c6eb602; during this task the repository advanced to 69741ef on main. I did not run a commit or push. No local release tag exists. The web unit suite passed (64 tests); the backend unit suite had 2 failing tests, and disposable-database E2E setup was blocked because Docker Desktop was unavailable. No live application or physical-device demonstration was performed.

## Contents

- [Requirement traceability](01-requirement-traceability.md)
- [Candidate cover sheet](02-candidate-submission-cover-sheet.md)
- [Clean setup guide](03-clean-setup-guide.md)
- [Assessment access guide](04-assessment-access-guide.md)
- [Live demonstration guide](05-live-demonstration-guide.md)
- [Final submission checklist](06-final-submission-checklist.md)
- [Candidate declaration](07-candidate-declaration.md)
- Technical packs in [docs/](docs/): architecture, API, database, deployment, testing, operations, and technical defense questions.
- Evidence instructions in [evidence/README.md](evidence/README.md).

## Readiness snapshot

The core coffee ordering workflows, staff status operations, customer order history/tracking, admin catalog and inventory operations, account/role administration, reporting, audit events, versioned API, and data constraints are represented in source. The web and backend unit suites were run; the actual outcomes, including backend cancellation failures, are recorded in evidence/automated-tests/2026-10-29-unit-test-run.md. The disposable PostgreSQL E2E script was attempted and could not start because Docker Desktop was not running. Backup/restore and load-balancer scripts were inspected but not executed.

Material submission gaps include a known failing backend cancellation unit test, no successful database E2E run, no release tag or pull-request evidence in the inspected repository state; no verified assessment accounts, deployment endpoint, mobile device evidence, load-balancer run, database restore result, or monitoring/alerting proof; no configured read replica; and no evidenced upgrade/rollback rehearsal. The assessment guide lists practical evidence collection steps for each gap.

## Evidence and disclosure

Do not submit secrets, real credentials, customer information, or unredacted database dumps. The current .env was deliberately not read. The cover sheet includes the AI-assisted documentation disclosure for candidate review and confirmation. The candidate must complete unknown fields and personally review and sign the supplied declaration.
