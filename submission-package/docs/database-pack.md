# Database Pack

## Engine and access

The Prisma datasource is PostgreSQL. Docker Compose pins postgres:16-alpine; code comments refer to PostgreSQL 16/17. The exact locally installed server version was not discovered. Compose publishes the database only on loopback at 127.0.0.1:5432 and places internal services on a bridge network. DATABASE_URL must use host postgres from containers and a host loopback address for a backend running directly on Windows. Do not use the committed example credentials outside an isolated local evaluation environment; replace every sample value.

## Entity overview

    users -- user_roles -- roles
    users -- refresh_tokens
    categories -- products -- inventory
    products -- stock_movements
    users -- orders -- order_items -- products
    orders -- order_status_history
    orders -- payment_records
    users -- idempotency_keys
    users -- audit_events

## Tables and integrity

| Table | Purpose and principal fields | Constraints/indexes |
|---|---|---|
| users | Identity, email, full name, password hash, phone, active state, timestamps | UUID PK; unique email; active index. |
| roles, user_roles | CUSTOMER/STAFF/ADMIN roles and assignments | Unique role name; composite assignment PK; foreign keys. |
| refresh_tokens | Hashed refresh credentials, expiry, revocation | Unique token hash; lookup index; cascade on user removal. |
| categories | Active menu group, slug and display order | Unique name/slug; display/active index. |
| products | Category, slug, description, image, base price in integer minor units, active flag | Unique slug; category/active index; price nonnegative check; category FK restrict. |
| inventory | One quantity and low-stock threshold per product | Unique product; nonnegative checks; product FK restrict. |
| stock_movements | Append-oriented signed stock change, balance, reason, actor and timestamp | Product/time index; foreign keys; used with inventory transactions. |
| orders | Customer, order number, state, integer subtotal/tax/total, notes, timestamps | Unique order number; customer/time and state/time indexes; nonnegative and exact total checks. |
| order_items | Product and frozen name/price snapshots, quantity, line total | Order index; quantity positive; price nonnegative; exact line total check. |
| order_status_history | From/to state, actor, reason and time | Order/time index. |
| payment_records | Provider, unique transaction ID, amount, payment status, failure reason | Unique transaction ID; order index; amount nonnegative. |
| idempotency_keys | Caller key, user, SHA-256 payload fingerprint, state, cached response, expiry | Key PK; user FK; expiry and lookup indexes. |
| audit_events | Actor, action, entity, old/new JSON values, IP/user agent and time | Entity and time indexes; user FK set null. |

Enums include RoleType, OrderStatus, StockMovementReason, PaymentStatus and IdempotencyStatus. PaymentStatus gained PENDING in the 2026-10-28 migration to support unpaid cash pickup and pending gateway transactions. Initial migration defines tables, indexes, foreign keys and SQL CHECK constraints. Inspect apps/backend/prisma/schema.prisma and migrations for current schema details.

## Transaction and consistency guarantees

Order service obtains authoritative product prices, applies integer arithmetic, reserves inventory in an interactive Prisma transaction and writes movements. InventoryConcurrencyService locks each product inventory row using SELECT ... FOR UPDATE and sorts product IDs to reduce deadlocks. Idempotency records persist a request hash and cached response for replay prevention. Database unique constraints provide a final guard for user email, order number, payment transaction ID and idempotency key.

These are implementation claims from source, not a completed concurrency benchmark. Run the e2e test script with disposable PostgreSQL and inspect stock and order state to verify behavior in the candidate environment.

## Migrations and seed behavior

Migration folders:

- 20261026000000_init: initial relational schema, integrity constraints and tables.
- 20261028000000_cash_payment_pending: adds PENDING to PaymentStatus.

Seed source is apps/backend/prisma/seed.ts. The documented production deployment runs prisma migrate deploy through the db-migrate service. The root scripts include prisma:deploy and prisma:seed. Migration/bootstrap safety has not been run as part of this package.

## Connection security and least privilege

Compose initializes a database owner and an application role via deploy/postgres/init/01-create-app-role.sh. The backend should use the app account rather than superuser for routine operations. Restrict network reachability, rotate local secrets, use TLS for remote connections, and grant only required schema/table privileges. The actual privileges of the current runtime account were not queried.

## Backup and recovery

PowerShell and shell backup/restore helpers are present. scripts/test-backup-restore.ps1 creates a disposable restore target, compares row counts and removes the target afterward when successful. A separate scripts/restore.ps1 drops/recreates its named target and should only be used with an explicitly disposable database. No backup restoration was executed for this package. No replication or standby configuration was found. Recovery therefore depends on restoring a verified backup to a single PostgreSQL instance; RPO/RTO are not defined by the repository.

## Recommendations

Record and enforce backup retention, encryption and off-host storage; schedule restore drills; define RPO/RTO; monitor backup age and restore outcomes; confirm app-role grants; and, if required, design replication/failover with a documented consistency and promotion procedure.
