# Evidence Register and Capture Checklist

A summarized record of the web/backend unit test runs and the blocked disposable database E2E attempt is in automated-tests/2026-10-29-unit-test-run.md. Full raw runner logs were not saved. Other items below still require genuine evidence. Store only sanitized outputs under this folder. Keep originals unchanged outside the package if needed for audit. Do not create evidence files from expected results or screenshots of mock screens.

| Folder / evidence | Supports | Capture and success criteria | Redact |
|---|---|---|---|
| repository/ | Repository/release requirements | Save repository URL, git log, git branch -a, git tag, clean final status, and actual PR/review links. Tag points to exact demonstrated commit. | User home paths if unnecessary; credentials. |
| automated-tests/ | Functional, negative, API, database requirements | Save command, date, runtime/environment, exit code, summary and full genuine test output. Mark failures as failures. | Env dumps, tokens, personal paths. |
| api-tests/ | Success, invalid, unauthorized, duplicate, oversized and gateway failure scenarios | Export sanitized requests/responses from Swagger/curl; show HTTP statuses and correlation IDs. | Bearer tokens, email/phone, secret headers. |
| security/ | Authentication, authorization, validation, CORS and gateway controls | Record test matrix and genuine results, including denied access. | Credentials and key material. |
| database/ | Migration, seed, constraints and recovery | Capture PostgreSQL version, migration status, synthetic seed counts and constraint checks on disposable database. | Connection strings/passwords, real records. |
| backup-restore/ | Backup/recovery | Run scripts/test-backup-restore.ps1 against the Compose test database; retain sanitized pass/fail output and row-count comparison. | Dump contents and secrets. |
| deployment/ | Docker build, health, TLS, upgrade/restart/rollback | Capture docker compose ps, image build logs, health responses, TLS certificate/route checks and rollback rehearsal. | Registry credentials, private cert/key. |
| load-balancing/ | Distribution/continuity | Run the demo script in a disposable test setup and capture both instance IDs and failure/recovery results. | Host-private details if not needed. |
| mobile/ | Physical-device auth/order/error | Capture actual device/model and app screens, successful auth, principal transaction and error state. Do not claim emulator as physical device. | Notifications, account data, tokens. |
| monitoring/ | Health/logs/alerts | Capture live/ready probes and JSON gateway logs. If no active monitoring exists, document manual evidence and leave alert proof as missing. | IPs or identifiers not needed for assessment. |
| release/ | Final release and demonstration | Record exact commit/tag and final verification results. | Any secret-bearing console output. |

## Screenshot checklist

- [ ] Responsive web catalog, detail, search, empty/loading/failure state.
- [ ] Valid and invalid sign-in, plus role-specific navigation.
- [ ] Customer order, payment state, order tracking/history.
- [ ] Staff queue and valid/invalid status transitions.
- [ ] Admin product/price, stock, users/roles, reports and audit views.
- [ ] Mobile physical-device sign-in, order, tracking, and error condition.
- [ ] Database status and migration/seed evidence.
- [ ] Docker service/health and gateway routing.
- [ ] Actual automated test summaries, load-balancing, restore, and rollback outputs.

Evidence status at package creation: unit-test summary is recorded, including failures and warnings; database E2E was blocked. Full runner logs, API/runtime, security, restore, deployment, load balancing, mobile and live demonstration evidence remain EVIDENCE REQUIRED.
