# Technical Defense Question Bank

Answers describe the inspected source. They are not substitutes for executing the demonstration or explaining decisions in the candidate's own words.

## Architecture and APIs

1. **What architectural style does the project use?**  
   A modular monolith in NestJS, organized by auth, products, orders, inventory, payment, audit, users and health modules. Web and mobile clients use the same versioned REST API; a mock payment process runs separately.

2. **Why keep order rules in the backend?**  
   The API is the trusted boundary. It retrieves current price and stock, computes totals, enforces roles and transitions, and persists the result. Client-side calculations are presentational only.

3. **What is the API version and documentation path?**  
   main.ts applies the /api/v1 global prefix and configures Swagger at /api/v1/docs. The prefix root itself is not a registered endpoint.

4. **How do clients share domain meanings?**  
   The packages/shared workspace exports enums and contracts consumed by backend and clients. Runtime DTO validation still happens in the backend.

5. **Is this a microservice architecture?**  
   No. Business domains are modules inside one Nest API process. The mock payment server is a separate service, and Compose can run multiple API replicas.

6. **How should an order request be shaped?**  
   It contains one to twenty product lines, each with a UUID v4 product ID and quantity 1–20, optional customer notes and a payment provider choice. The DTO does not accept client-authored price totals or structured customization per line.

## Authentication and security

7. **How is a password stored?**  
   AuthService hashes passwords using bcryptjs; the database stores passwordHash. Raw passwords should not be logged or persisted.

8. **How are refresh tokens protected?**  
   The schema stores token hashes, expiry and revocation state. AuthService rotates and revokes refresh credentials; demonstrate the behavior with tests before claiming runtime proof.

9. **How are roles enforced?**  
   Controllers use JwtAuthGuard and RolesGuard with role metadata. For example, admin product/user/report operations require ADMIN while staff order operations allow STAFF and ADMIN.

10. **Why is hiding an admin button insufficient?**  
    Client navigation is not a security boundary. A user can call the API directly; backend guards must reject the operation. Demonstrate an actual denied request.

11. **What does the validation pipe do?**  
    It transforms DTO inputs, whitelists declared properties and rejects unknown properties. DTO decorators validate types, bounds, UUIDs and enums.

12. **How are errors correlated?**  
    CorrelationIdMiddleware assigns/propagates a correlation identifier; the exception filter returns a standardized response. Capture actual response and logs to verify its exact behavior.

13. **Which protections are at the gateway?**  
    Nginx config defines auth/general rate-limit zones, 10 MB request size, upstream and proxy timeouts, forwarded headers, selected security headers, JSON access logs and upstream retry behavior. These settings require runtime testing at the gateway.

14. **What CORS origins are allowed?**  
    Backend reads comma-separated CORS_ORIGINS and defaults in source to local web origins. Production values should be exact deployment origins; CORS is not authentication.

15. **Where do secrets belong?**  
    Backend environment or an approved secret store. Chapa private/webhook keys must not go in Vite or Expo public variables, source control, screenshots or logs.

## Database and order consistency

16. **How is duplicate order submission handled?**  
    A client may send Idempotency-Key. Service stores a request hash, status and cached response; repeated matching requests replay, conflicting payloads are rejected, and concurrent key insertion is protected by a unique constraint.

17. **What happens if an idempotency key is omitted?**  
    The endpoint treats it as optional, so the database-backed duplicate replay mechanism is not activated for that request. Client should create and reuse a key per logical submission.

18. **How does the system avoid overselling?**  
    InventoryConcurrencyService sorts product IDs, locks inventory rows using SELECT FOR UPDATE, checks available quantity, updates balances and inserts movement rows inside a transaction. This must be demonstrated with concurrent DB tests.

19. **Why store item price/name snapshots?**  
    OrderItem captures product name and unit price at checkout so later catalog changes do not rewrite historical receipts.

20. **What monetary representation is used?**  
    Prices and totals use integer cents/minor units, avoiding floating-point arithmetic for persisted calculations. Confirm display conversion in client formatters.

21. **What protects relational integrity?**  
    Foreign keys, unique indexes, primary keys and SQL CHECK constraints cover relationships, nonnegative balances/prices/totals, positive quantities and exact line/order totals.

22. **What database replication is configured?**  
    None was found. Compose has one PostgreSQL service. The candidate should describe backup-based recovery and not claim replica failover.

23. **How can seed data be used safely?**  
    Use only an isolated local assessment database. The seed source includes fixed synthetic demo users and fixed passwords, and refuses NODE_ENV=production. Do not expose these identities publicly; create/rotate separate assessment accounts for a shared environment.

## Payments and failure handling

24. **How is Chapa payment success established?**  
    The server initializes checkout and verifies transaction state with Chapa. Callback/verification/webhook/reconciliation paths update application state only after server-side verification; the browser return is not trusted.

25. **How are webhook requests authenticated?**  
    The payment service uses raw request bytes to compute HMAC and compares the supported signature headers against configured webhook secret. Invalid signatures are rejected before applying payment changes.

26. **What does reconciliation do?**  
    It scans aged pending Chapa payments and asks the provider to verify each reference, applying resulting state. A configured interval triggers it inside each process; it is not a distributed queue or leader-elected worker.

27. **How are transient provider errors handled?**  
    PaymentClientService uses configured timeout and bounded retry logic for transient errors. Permanent declines should not be retried. Explain actual retry policy from source and show the mock failure test.

28. **What is the difference among Chapa, cash and mock payment?**  
    Chapa redirects to a hosted provider checkout; cash on pickup stores a pending collection state; mock payment simulates success/decline/timeout for testing. Do not confuse test simulation with real settlement.

## Deployment, testing and operations

29. **How is the app deployed in Compose?**  
    Compose defines a migration job, PostgreSQL, two Nest API containers, mock provider, web static server and Nginx gateway. It is a configured topology; actual deployment success requires build and health evidence.

30. **How does load balancing work?**  
    Nginx upstream lists api-node-1 and api-node-2 with round robin and failure thresholds. A script also simulates two local API instances. Neither configuration nor script proves a successful demo until run.

31. **What does readiness check?**  
    API readiness queries PostgreSQL connectivity and returns ready or degraded status; liveness reports process status. Gateway health is a separate static route.

32. **What automated tests exist?**  
    Jest unit tests for backend/mobile/shared, Vitest for web, Nest e2e tests, and CI steps for format, lint, typecheck, test and build. The package creator did not execute them; present exact actual results only after running.

33. **How do you test migrations safely?**  
    Use scripts/test-e2e.ps1, which launches a temporary PostgreSQL container, generates Prisma, deploys migrations, seeds, runs e2e and cleans up. Verify Docker/port prerequisites and retain real output.

34. **How do you test backup recovery?**  
    scripts/test-backup-restore.ps1 creates a dump, restores it to a disposable database, compares selected row counts and removes the target. Confirm target cleanup and never run destructive restore on valuable data.

35. **What is the rollback strategy?**  
    Compose/CI does not define automated rollback. Keep the previous image/tag, use backward-compatible migrations where possible, verify a disposable upgrade, and rehearse restore or forward-fix. Image rollback alone does not reverse schema changes.

36. **What monitoring exists?**  
    Health endpoints and Nginx JSON logs exist. No metrics/dashboard/alerting system was found. Explain this gap and propose alerts for readiness, 5xx, DB, payment failures and backup age without calling them implemented.

37. **How does mobile store auth state?**  
    Mobile uses an API client and secure-session helper backed by Expo SecureStore. Demonstrate on a physical device; emulator behavior does not satisfy the physical-device requirement.

38. **What is the main customization limitation?**  
    The API persists free-form customer notes but no structured per-item customization schema was found. A next iteration should model validated options and snapshot them on order items.

39. **What evidence would establish the release is reproducible?**  
    A verified tag-to-commit mapping, clean setup execution, migration/seed result, test output, deployment health, screenshots and sanitized API/database evidence tied to that commit.

40. **Which claims should be qualified in the README?**  
    Claims such as zero-downtime failover, production readiness, and test counts need actual output and environment context. Source/configuration alone supports “configured” or “implemented in code,” not “verified.”
