# Akufada Assessment Submission Package

This package maps the Coffee Shop Order Management assessment to the implementation in this repository. It separates source-backed implementation from behavior that has been run and observed. At preparation time, the repository is on main at c6eb602; there are no local release tags, and no runtime tests or demonstrations were executed for this package. Two web files were already modified in the worktree before documentation began and were left untouched.

## Contents

- Requirement traceability: 01-requirement-traceability.md
- Candidate cover sheet: 02-candidate-submission-cover-sheet.md
- Clean setup guide: 03-clean-setup-guide.md
- Assessment access guide: 04-assessment-access-guide.md
- Live demonstration guide: 05-live-demonstration-guide.md
- Final submission checklist: 06-final-submission-checklist.md
- Candidate declaration: 07-candidate-declaration.md
- Technical packs in docs/: architecture, API, database, deployment, testing, operations, and technical defense questions.
- Evidence instructions in evidence/README.md.

## Readiness snapshot

The core coffee ordering workflows, staff status operations, customer order history/tracking, admin catalog and inventory operations, account/role administration, reporting, audit events, versioned API, and data constraints are represented in source. Automated unit and integration test files, a disposable PostgreSQL e2e script, backup/restore and load-balancer scripts, and a CI workflow are present. Their presence is not proof that they pass in the candidate environment. This package did not run those checks.

Material submission gaps include no release tag or pull-request evidence in the inspected repository state; no verified assessment accounts, deployment endpoint, mobile device evidence, load-balancer run, database restore result, or monitoring/alerting proof; no configured read replica; and no evidenced upgrade/rollback rehearsal. The assessment guide lists practical evidence collection steps for each gap.

## Evidence and disclosure

Do not submit secrets, real credentials, customer information, or unredacted database dumps. The current .env was deliberately not read. The cover sheet includes the AI-assisted documentation disclosure for candidate review and confirmation. The candidate must complete unknown fields and personally review and sign the supplied declaration.
