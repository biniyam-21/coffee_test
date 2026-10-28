# Coffee Shop Order Management System (Akufada)

An enterprise-grade, multi-client Coffee Shop Order Management System designed for high reliability, concurrency safety, and seamless omnichannel ordering. Built with a modern TypeScript monorepo architecture featuring **NestJS**, **React 18 / Vite**, **PostgreSQL (Prisma ORM)**, **Nginx Load Balancing**, and **Chapa Payment Gateway Integration**.

---

## Visual Showcase & User Journey

Here is a walkthrough of the core customer journey in the live Akufada application:

### 1. Interactive Coffee Menu & Catalog
Explore premium Ethiopian single-origin beans and handcrafted brews. Browse by category (Single Origin, Espresso, Cold Brew), view roast profiles, tasting notes, real-time stock levels, and historical price freezes.

![Akufada Menu Catalog](docs/screenshots/01-menu-catalog.png)

### 2. Shopping Cart & Real-Time Calculations
The responsive sliding Cart Drawer provides persistent per-user shopping bag state, fine-grained quantity adjustments, automatic VAT (15%) calculation, and dynamic subtotal tracking.

![Akufada Cart Drawer](docs/screenshots/02-cart-drawer.png)

### 3. Streamlined Checkout & Multichannel Payments
Select your fulfillment preferences (custom milk choice, temperature notes) and choose your preferred payment method. Choose between **Chapa Hosted Sandbox Checkout**, **Cash Receiving (Cash on Pickup)**, or **Mock Payment Gateway Simulation**.

![Akufada Checkout Page](docs/screenshots/03-checkout-payment.png)

---

## System Architecture

```text
                                  +-----------------------------+
                                  |    Nginx Reverse Proxy &    |
                                  |   Load Balancer (Port 80)   |
                                  +--------------+--------------+
                                                 |
                       +-------------------------+-------------------------+
                       | Upstream Round-Robin                              | Health Check & Retry
                       v                                                   v
        +-----------------------------+                     +-----------------------------+
        |   API Node 1 (Port 3001)    |                     |   API Node 2 (Port 3001)    |
        |     NestJS Core Engine      |                     |     NestJS Core Engine      |
        +--------------+--------------+                     +--------------+--------------+
                       |                                                   |
                       +-------------------------+-------------------------+
                                                 |
                                                 v
                       +---------------------------------------------------+
                       |        PostgreSQL Database (Prisma ORM)           |
                       | - Pessimistic Concurrency (Row-Level Locking)     |
                       | - Idempotent Client Submissions                   |
                       | - Immutable Stock Movement & Audit Logs           |
                       +---------------------------------------------------+
                                                 |
                                                 v
                       +---------------------------------------------------+
                       |         External Payment Gateways                 |
                       | - Chapa Hosted Sandbox (ETB Mobile & Card)        |
                       | - Mock Gateway Service (Port 4000)                |
                       +---------------------------------------------------+
```

### Core Architecture Highlights

- **Shared Domain Contracts (`@akufada/shared`):** Single source of truth for TypeScript interfaces, DTOs, and lifecycle enums across all backend, web, and mobile clients.
- **Pessimistic Concurrency Control:** Prevents inventory overselling under high concurrency by utilizing atomic row-level locks (`SELECT ... FOR UPDATE`) during order placement.
- **Client Idempotency (`IdempotencyKey`):** Automatic client-generated idempotency keys prevent duplicate order charging in the event of transient network drops or rapid multiple clicks.
- **Payment Resiliency & Reconciliation:** Supports Chapa hosted checkout with cryptographic HMAC webhook verification, exponential backoff retries, and an automated background reconciliation worker.
- **Dual-Replica Load Balancing:** Dockerized multi-node architecture behind an Nginx upstream proxy with automatic failover and zero-downtime rolling upgrades.

---

## Quickstart & How-to-Run Guide

You can run Akufada either via **Local Development Mode** (recommended for evaluation and testing) or via **Production Docker Compose**.

### Prerequisites

- **Node.js:** `>= 20.11.0 LTS` (Tested on Node.js v22.14.0)
- **npm:** `>= 10.0.0`
- **PostgreSQL:** `16` or `17` (Running on port `5433` or standard `5432`)
- **Git:** `>= 2.40.0`
- **Docker Desktop:** *(Required only for Docker Compose mode)*

---

### Method A: Local Development (Step-by-Step)

#### 1. Clone & Configure Environment
```bash
# Clone the repository
git clone https://github.com/biniyam/akufada.git
cd akufada

# Copy environment variables template
cp .env.example .env
```

Ensure your `.env` contains valid database credentials (default is configured for PostgreSQL on port `5433`):
```env
PORT=3001
DATABASE_URL="postgresql://postgres:root@localhost:5433/akufada_db?schema=public"
JWT_ACCESS_SECRET="dummy_local_development_jwt_access_secret_key_at_least_32_chars_long"
JWT_REFRESH_SECRET="dummy_local_development_jwt_refresh_secret_key_at_least_32_chars_long"
MOCK_PAYMENT_URL="http://localhost:4000"
```

#### 2. Install Monorepo Dependencies
```bash
npm install
```

#### 3. Build Shared Contracts & Generate Prisma Client
```bash
# Build the TypeScript contracts shared by all apps
npm run build:shared

# Generate Prisma Client and apply database migrations
npm run prisma:generate
npm run prisma:deploy
```

*(Optional) Seed the database with initial coffee products, categories, and test accounts:*
```bash
npm run prisma:seed
```

#### 4. Launch the Applications
Open separate terminal tabs for each service:

```bash
# Terminal 1: NestJS Backend API (http://localhost:3001/api/v1)
npm run dev:backend

# Terminal 2: Web Client with Vite HMR (http://localhost:3000)
npm run dev:web

# Terminal 3: Mock External Payment Gateway (http://localhost:4000)
npm run dev:mock

# (Optional) Terminal 4: React Native Mobile Client with Expo Metro
npm run dev:mobile
```

Open your browser at **[http://localhost:3000](http://localhost:3000)** to experience the full customer, barista, and admin experience!

---

### Method B: Production Docker Compose Orchestration

To run the entire clustered stack (Nginx Gateway, 2x API Replicas, Web Server, Mock Payment Service, and PostgreSQL):

```bash
# 1. Build and start all container services in detached mode
docker compose up -d --build

# 2. Inspect cluster status and health check probes
docker compose ps

# 3. View live consolidated logs
docker compose logs -f
```

The application will be accessible through the Nginx gateway at **`http://localhost:80`** (or the port defined by `GATEWAY_PORT` in your `.env`).

---

## Chapa Payment Integration Testing

Akufada comes pre-wired for **Chapa Sandbox Test Mode**:

1. **Obtain Sandbox Keys:**
   Create a free developer account at [dashboard.chapa.co](https://dashboard.chapa.co) and navigate to **Settings > API Keys & Webhooks**.
2. **Update `.env` Keys:**
   ```env
   CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx
   CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx
   CHAPA_EXPECTED_MODE=test
   CHAPA_RETURN_URL=http://localhost:3000/payment/return
   ```
3. **Public Webhook Exposure via ngrok:**
   Expose your local backend so Chapa can deliver asynchronous payment notifications:
   ```bash
   ngrok http 3001
   ```
   Set `CHAPA_CALLBACK_URL` and `CHAPA_WEBHOOK_URL` in `.env` to your forwarding ngrok URL:
   ```env
   CHAPA_CALLBACK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/payments/chapa/callback
   CHAPA_WEBHOOK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/payments/chapa/webhook
   ```
4. **Execute Checkout:**
   - On the checkout screen, select **Chapa test checkout**.
   - Click **Place Order**; you will be redirected to Chapa's hosted payment gateway.
   - Complete the test payment (Test Card or Telebirr/CBE sandbox).
   - Chapa redirects back to `/payment/return?tx_ref=...`, the payment is verified, and your order moves to `CONFIRMED`!

---

## Role-Based Demo Accounts

Quick-access evaluation buttons are available directly on the login screen (`/login`). You can also sign in manually with these pre-seeded accounts:

| Role | Email Address | Password | Permissions & Available Views |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@akufada.com` | `CustomerPass123!` | Browse menu, cart, checkout, live order tracking, receipt history modal |
| **Staff / Barista** | `staff@akufada.com` | `StaffPass123!` | Barista kitchen queue (`/staff/queue`), advance order states (`IN_PREPARATION` &rarr; `READY_FOR_PICKUP`) |
| **Admin** | `admin@akufada.com` | `AdminPass123!` | Admin dashboard (`/admin`), inventory stock adjustments, audit event logs, user management |

---

## Automated Quality Gates & Testing

Akufada enforces a comprehensive automated test matrix with **111 passing tests** across unit, component, integration, and security boundaries:

```bash
# Execute the full sequential quality gate pipeline
npm run check
```

### Individual Quality Commands:
- `npm run lint` &mdash; ESLint static code analysis across all monorepo packages.
- `npm run format:check` &mdash; Prettier code consistency and style verification.
- `npm run typecheck` &mdash; Strict TypeScript compiler verification (`tsc --noEmit`).
- `npm test -w @akufada/backend` &mdash; Backend Jest test suite (Authentication, Inventory concurrency, Orders, Payment retries).
- `npm test -w @akufada/web` &mdash; Frontend Vitest & React Testing Library component tests.
- `npm test -w @akufada/mock-payment` &mdash; Mock payment gateway charge simulation tests.

---

## Operational Runbooks & Disaster Recovery

### 1. Multi-Instance Load Balancing & Failover Drill
Test dual-node upstream round-robin routing and automated retry failover:
```bash
node scripts/test-load-balancer.js
```

### 2. Database Physical Backup & Disposable Restore Drill
Create a timestamped compressed database dump and verify data parity on a disposable test database:
```powershell
# Create backup
powershell.exe -ExecutionPolicy Bypass -File ./scripts/backup.ps1 -OutputDir "./backups"

# Test restore into akufada_restore_test
powershell.exe -ExecutionPolicy Bypass -File ./scripts/restore.ps1 `
  -BackupFile (Get-Item .\backups\akufada_backup_*.dump | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName `
  -RestoreTargetDb "akufada_restore_test"
```

### 3. Automated End-to-End Test Suite
```powershell
powershell.exe -ExecutionPolicy Bypass -File ./scripts/test-e2e.ps1
```

---

## Project Structure

```text
Akufada/
├── apps/
│   ├── backend/             # NestJS 10 REST API server
│   │   ├── prisma/          # Schema definitions, migrations, seed data
│   │   └── src/             # Auth, Users, Products, Inventory, Orders, Payments, Audit
│   ├── web/                 # React 18, Vite, Tailwind CSS client
│   │   └── src/             # Layout, Menu, Cart, Checkout, Order Tracking, Admin, Staff
│   ├── mobile/              # React Native Expo SDK 51 client
│   └── mock-payment/        # Standalone Express mock payment gateway
├── packages/
│   └── shared/              # Shared TypeScript domain contracts & enums
├── deploy/
│   ├── nginx/               # Nginx gateway configs & upstream load-balancing rules
│   └── postgres/            # PostgreSQL configuration overrides
├── docs/
│   ├── screenshots/         # Captured high-resolution UI walkthrough screenshots
│   ├── phase-1/ to phase-8/ # Comprehensive phase documentation, specs & defense runbooks
│   ├── backend-api.md       # Complete REST endpoint reference & payload schemas
│   └── chapa-payment-integration.md # Detailed Chapa gateway implementation guide
├── scripts/                 # Automated operational runbooks (backup, restore, e2e, load-test)
├── docker-compose.yml       # Production clustered orchestration definition
└── package.json             # Root npm workspaces configuration
```

---

## Comprehensive Phase Documentation Index

Detailed phase specifications, architectural designs, threat models, and engineering sign-offs are organized in the [`docs/`](docs/) directory:

- [Phase 1: Technical Architecture & Planning](docs/phase-1/)
- [Phase 2: Repository Foundation & Engineering Quality Gates](docs/phase-2/)
- [Phase 3: Database Architecture, Migrations & Concurrency](docs/phase-3/)
- [Phase 4: Secure Backend API, Core Business Logic & Operations](docs/phase-4/)
- [Phase 5: Responsive Web Application & Role-Based Workflows](docs/phase-5/)
- [Phase 6: React Native Mobile Application & Secure Storage](docs/phase-6/)
- [Phase 7: System Integration, Docker Deployment & Disaster Recovery](docs/phase-7/)
- [Phase 8: Release, Verification & Technical Defense](docs/phase-8/)
  - [`00-release-and-defense-master-plan.md`](docs/phase-8/00-release-and-defense-master-plan.md) &mdash; Defense Master Plan
  - [`02-full-test-suite-and-verification.md`](docs/phase-8/02-full-test-suite-and-verification.md) &mdash; 111 Tests Verification
  - [`07-demonstration-script-and-rehearsal.md`](docs/phase-8/07-demonstration-script-and-rehearsal.md) &mdash; 10-Minute Viva Demonstration Script
  - [`08-technical-defense-qa.md`](docs/phase-8/08-technical-defense-qa.md) &mdash; 25 Comprehensive Defense Questions & Answers

---

## License & Evaluation Notice

This project was developed for the **Software Engineering Practical Examination (Akufada Project)**. All architecture, concurrency mechanisms, and code artifacts are engineered to satisfy enterprise-grade production defense standards.
