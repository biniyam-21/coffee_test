# Operations Pack

## Startup and shutdown

For the full Compose stack, use docker compose up -d --build, inspect docker compose ps and logs, then stop with docker compose down. Omit -v to preserve the PostgreSQL volume. For local app development, use the root workspace scripts described in 03-clean-setup-guide.md. Do not run host backend with a Compose-only DATABASE_URL hostname.

## Health checks and logs

- API liveness: GET /api/v1/health/live reports process/instance information.
- API readiness: GET /api/v1/health/ready checks database connectivity and returns 503 when degraded.
- Gateway: GET /health is a static gateway liveness response.
- Mock service: Compose health check requests /health on port 4000.
- Compose: docker compose ps and docker compose logs --since 10m <service>.

Nginx access log format is JSON and includes timestamp, request method/URI, status, request/upstream timings, upstream address/status, referrer/user agent and correlation ID. Application adds a correlation middleware and instance response header. Avoid logging or sharing authorization headers and payment secrets.

## Monitoring and alert recommendations

No metrics backend, dashboard, on-call alert, or alert configuration was found. Existing probes and logs are basic operational signals, not a monitoring system. For a deployment, alert on readiness failure, elevated 5xx/502/504 rates, database connection exhaustion, sustained payment-init/verification failures, reconciliation backlog age, low inventory (business alert), backup age/failure, disk pressure, and repeated auth rate limits. Thresholds must be tuned from service baseline and service-level objectives; none are configured in this repository.

## Common failure troubleshooting

| Symptom | Checks |
|---|---|
| API cannot connect to database | Confirm Postgres health; inspect DATABASE_URL host: use postgres inside Compose and 127.0.0.1 from host; verify app-role grants and port. Never print URL value into shared logs. |
| Readiness returns 503 | Inspect API and Postgres logs, DB reachability, migrations and connection pool. |
| Swagger returns 404 | Open /api/v1/docs, not bare /api/v1. Ensure backend or gateway is running. |
| Login rejects a known test account | Confirm seed ran against the intended disposable DB, account active flag and role; never disclose password in evidence. |
| Protected operation returns 401/403 | 401 indicates missing/invalid token; 403 commonly indicates valid identity without required role or ownership. Check API roles, not only client navigation. |
| Orders return provider error | Inspect sanitized backend logs and correlation ID; check provider configuration/mode, callback reachability and provider health. Keep private key server-side. |
| Chapa return page says pending | Browser return is not payment proof. Use authenticated verification, signed webhook and reconciliation; check transaction reference and server-to-server verify response. |
| Gateway returns 502/504 | Check API health, upstream container names/network, API dependencies, timeout and correlated Nginx upstream log. |
| Mobile cannot reach API | Replace localhost with computer LAN IP, ensure phone and host network connectivity, firewall port and API bind address; check EXPO_PUBLIC_API_URL. |
| Seed/migration errors | Confirm clean isolated database and migration history; inspect Prisma output. Do not reset or drop a valued database. |

## Backup and restore runbooks

The PowerShell backup helper writes a compressed pg_dump archive into backups/. The test-backup-restore.ps1 helper checks Compose Postgres, creates an archive, restores it to a uniquely named disposable database, compares row counts, then attempts cleanup. Record the output and inspect target cleanup. Do not commit dumps. Encryption/off-host retention are not implemented here.

The separate restore.ps1 accepts a named target defaulting to akufada_restore_test and issues DROP DATABASE before recreating it. It can destroy data in a database with that name; only use after verifying the target is disposable and never point it to the primary. Prefer the isolated test-backup-restore.ps1 workflow.

## Upgrade, rollback and incident recovery

No automated upgrade/rollback runbook or migration reversal was found. Before upgrade: verify backup, review schema compatibility, build images from a tagged commit, apply migrations to a disposable copy, run smoke/e2e tests, and schedule a maintenance window. For failure: stop rollout, preserve logs and correlation IDs, restore service image if schema-compatible, or follow a rehearsed restore/forward-fix plan. Do not assume an image rollback reverses database migrations.

Incident evidence should include timestamp/timezone, release tag/commit, affected services, sanitized correlation IDs, health and gateway logs, payment references (not secrets), customer impact using synthetic data, actions and recovery verification.

## Secret and configuration handling

Keep .env out of Git, provide secrets through a protected environment or secret store, rotate exposed credentials, restrict access, and avoid putting private keys in client build variables. The current .env was not inspected and values are intentionally omitted.

## Operational gaps

No monitoring/alerting, replication, automated deployment, tested TLS, backup retention, stated RPO/RTO, or verified rollback evidence was found. Document and demonstrate these as gaps until completed.
