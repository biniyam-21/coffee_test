# API Pack

## Base path and conventions

The Nest application sets global prefix /api/v1. Swagger UI is configured at /api/v1/docs. A GET to the prefix root itself is not implemented and may return a not-found response. Browser origins are limited by CORS_ORIGINS (defaults in source to localhost:3000 and localhost:5173). Most protected routes use Authorization: Bearer access-token. Global DTO validation enables transform, whitelist and forbidNonWhitelisted. UUID path values are checked as UUID v4 where declared.

Examples below are sanitized and illustrative based on DTOs; they are not captured runtime responses. HTTP error envelope is produced by GlobalHttpExceptionFilter; confirm exact field values in a running instance before using examples as evidence.

## Authentication endpoints

| Method and path | Access | Input / behavior | Main outcomes |
|---|---|---|---|
| POST /api/v1/auth/register | Public | RegisterDto: fullName, email, password, optional phoneNumber | 201 created; 400 validation; 409 email conflict. |
| POST /api/v1/auth/login | Public | LoginDto email/password | 200 tokens/profile; 401 invalid credentials. |
| POST /api/v1/auth/refresh | Public | RefreshTokenDto with refresh token | 200 rotated tokens; 401 expired/revoked/invalid. |
| POST /api/v1/auth/logout | Authenticated | Current bearer user | 204 and active refresh-token revocation. |
| GET /api/v1/auth/me | Authenticated | Bearer token | 200 profile and roles; 401 unauthorized. |

## Menu and product endpoints

| Method and path | Access | Input / behavior | Main outcomes |
|---|---|---|---|
| GET /api/v1/products | Public | Query: categoryId, search, page (default 1), limit (default 20; 1–100), sortBy (createdAt/name/basePriceCents), sortOrder (ASC/DESC) | 200 paginated active catalog; invalid query 400. |
| GET /api/v1/products/{id} | Public | UUID v4 product ID | 200 product; 400 invalid UUID; 404 missing. |
| GET /api/v1/categories | Public | None | 200 active categories. |
| POST /api/v1/admin/products | ADMIN | CreateProductDto; initial stock and audit are handled by service | 201; 400 invalid input; 401/403 unauthorized. |
| PATCH /api/v1/admin/products/{id} | ADMIN | UUID and UpdateProductDto | 200 updated product; 400 invalid input; 401/403; 404 missing. |

No category administration endpoint was found. Item customization is represented by customerNotes rather than an independently validated per-item customization object.

## Orders and staff endpoints

| Method and path | Access | Input / behavior | Main outcomes |
|---|---|---|---|
| POST /api/v1/orders | CUSTOMER | items array (1–20 unique product lines); productId UUID v4, quantity integer 1–20; optional customerNotes; optional payment provider MOCK_GATEWAY/CASH_ON_PICKUP/CHAPA and simulated outcome SUCCESS/DECLINED/TIMEOUT. Optional Idempotency-Key header. | 201 order; 400 invalid/insufficient stock/provider setup; 401/403; 409 concurrent idempotency; 422 same key with different payload; 502 external provider failure. |
| GET /api/v1/orders | CUSTOMER/STAFF/ADMIN | QueryOrdersDto pagination/filtering; customer sees own orders, staff/admin may see cafe-wide results according to service | 200 paginated list; 401/403; 400 invalid query. |
| GET /api/v1/orders/{id} | Authenticated roles | UUID; customer must own it, staff/admin access per service | 200 details; 400 invalid UUID; 403 access denied; 404 missing. |
| GET /api/v1/orders/{id}/track | Authenticated roles | UUID; ownership/role checked | 200 timeline; 403/404. |
| POST /api/v1/orders/{id}/cancel | Authenticated roles | Optional cancellation reason | 200 cancelled/refunded stock where allowed; 400 disallowed state; 403/404. |
| GET /api/v1/staff/orders | STAFF/ADMIN | Optional status filter | 200 FIFO preparation queue; 401/403. |
| PATCH /api/v1/staff/orders/{id}/status | STAFF/ADMIN | UpdateOrderStatusDto: enum status and optional 1–255 character notes | 200 changed status; 400 invalid DTO/transition; 401/403/404. |

Illustrative order request:

    {"items":[{"productId":"550e8400-e29b-41d4-a716-446655440000","quantity":2}],"customerNotes":"Oat milk","payment":{"provider":"CASH_ON_PICKUP"}}

Server calculates price/tax; client-supplied totals are not part of the DTO. Duplicate product IDs within the same request are rejected by service logic. Order transaction and payment-provider sequencing are documented in the architecture pack.

## Inventory, administration and reporting endpoints

| Method and path | Access | Input / behavior | Main outcomes |
|---|---|---|---|
| GET /api/v1/admin/inventory | STAFF/ADMIN | None | 200 balances/low-stock indicators; 401/403. |
| POST /api/v1/admin/inventory/adjust | ADMIN | productId UUID, signed integer quantityDelta, StockMovementReason enum, optional notes length 1–255 | 200 adjustment; 400 negative stock/validation; 401/403; 404 product/inventory. |
| GET /api/v1/admin/users | ADMIN | QueryUsersDto | 200 paginated users excluding secret fields; 401/403. |
| PATCH /api/v1/admin/users/{id} | ADMIN | UUID and UpdateUserAdminDto | 200 redacted user; 400 validation; 401/403; 404 missing; 409 last-admin constraint. |
| GET /api/v1/admin/audit-events | ADMIN | QueryAuditDto pagination/filters | 200 paginated audit events; 401/403. |
| GET /api/v1/admin/reports/sales | ADMIN | QuerySalesReportDto date/range inputs | 200 aggregate metrics/top-selling items; 400 invalid query; 401/403. |

## Payment endpoints

| Method and path | Access | Input / behavior | Main outcomes |
|---|---|---|---|
| POST /api/v1/payments/chapa/webhook | Public transport route; validates Chapa signature | Raw request body; chapa-signature or x-chapa-signature header | 200 accepted/processed; 401 invalid/unconfigured signature; 4xx/5xx on invalid reference or verification issue. |
| GET /api/v1/payments/chapa/callback | Public provider callback | tx_ref or trx_ref query | Server verifies transaction with Chapa before applying result; missing/unknown ref fails. |
| GET /api/v1/payments/chapa/verify?tx_ref=... | Authenticated customer | Customer-owned transaction reference | Verified status; 401/404 and provider errors as applicable. |
| POST /api/v1/admin/payments/chapa/reconcile | ADMIN | Optional JSON limit (defaults to 50) | Reconciles aged pending payments; 401/403 and provider/validation errors. |

Order initialization calls Chapa inside POST /orders when provider is CHAPA; checkout URL is returned with the order result. Use the active test private/secret key only in backend environment; never include it in request examples, client variables or evidence.

## Health endpoints

| Method and path | Access | Behavior |
|---|---|---|
| GET /api/v1/health/live | Public | Process liveness, instance, uptime, timestamp and environment. |
| GET /api/v1/health/ready | Public | Checks database reachability; returns 200 when ready or 503 when degraded. |

## Negative and security scenarios to demonstrate

- Missing/invalid JWT on protected route: expect 401.
- Valid customer on admin route or other customer's order: expect 403.
- Unknown DTO properties or malformed UUID/enum/quantity: expect 400.
- Reuse an Idempotency-Key with changed payload: expect 422; duplicate concurrent execution: expect conflict.
- Request quantity above stock: expect a controlled client error, with no negative stock after transaction rollback.
- Body larger than the Nginx 10 MB cap: expected gateway rejection if traffic is routed through the configured gateway; test against the real deployed gateway.
- Provider unavailable/timeout: exercise the mock integration in its controlled test environment; record the real status and correlation ID.

## API source index

Controllers and DTOs are under apps/backend/src/auth, products, orders, inventory, users, audit, payment and health. The complete generated OpenAPI document from a running API is the source of truth for final status codes and schemas. This package did not query it at runtime.
