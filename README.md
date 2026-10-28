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

### Individual Application Run Guides

Akufada is built as an integrated monorepo workspace. You can run each component independently during development:

```text
+------------------------------------------------------------------------------------+
|                               AKUFADA WORKSPACE                                    |
+--------------------------+----------------------------+----------------------------+
| 1. BACKEND API           | 2. WEB CLIENT              | 3. MOBILE APP (EXPO)       |
| NestJS 10 REST Engine    | React 18, Vite & Tailwind  | React Native Expo SDK 51   |
| Port: 3001               | Port: 3000                 | Metro Port: 8081           |
| http://localhost:3001    | http://localhost:3000      | exp://<LAN_IP>:8081        |
+--------------------------+----------------------------+----------------------------+
```

---

#### 1. Running the Backend API Individually (NestJS + PostgreSQL)

The backend provides authoritative business logic, PostgreSQL database persistence (Prisma ORM), JWT authentication with refresh token rotation, inventory concurrency row-locking, and Chapa payment integration.

**Prerequisites:**
- Ensure PostgreSQL is active on port `5433` (or `5432` per your `DATABASE_URL`).
- Make sure shared contracts are compiled: `npm run build:shared`

**Execution Steps:**
```bash
# 1. Apply database migrations to ensure all tables, relations, and enums exist
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma

# 2. (Optional) Seed initial products, categories, and evaluation accounts
npm run prisma:seed -w @akufada/backend

# 3. Start NestJS backend in development/watch mode
npm run dev:backend
```

**Key Backend Endpoints:**
- **REST API Base:** `http://localhost:3001/api/v1`
- **Swagger Interactive Documentation:** `http://localhost:3001/api/v1/docs`
- **Liveness Health Probe:** `http://localhost:3001/api/v1/health/live`
- **Readiness Health Probe:** `http://localhost:3001/api/v1/health/ready`

*(Optional External Mock Payment Service: If you wish to test mock payment webhooks alongside Chapa, run `npm run dev:mock` in a separate terminal on port `4000`).*

---

#### 2. Running the Web Client Individually (React + Vite)

The web frontend offers the complete customer coffee ordering experience, sliding cart drawer, multi-method checkout, live visual order tracking, kitchen barista queue, and administrative management dashboard.

**Prerequisites:**
- Ensure the Backend API is running on port `3001`.

**Execution Steps:**
```bash
# In your terminal from the project root:
npm run dev:web
```

**Access & Key Views:**
- **URL:** Open **[http://localhost:3000](http://localhost:3000)** in your browser.
- **Customer Coffee Catalog:** `http://localhost:3000/` (Browse single origins, categories, add to cart).
- **Checkout & Multi-Payment:** `http://localhost:3000/checkout` (Chapa Sandbox, Cash on Pickup, Mock Gateway).
- **Live Order Tracking:** `http://localhost:3000/orders/:id/track` (Real-time progress stepper).
- **Customer Order History:** `http://localhost:3000/orders` (View receipt history in an aesthetic modal).
- **Barista Kitchen Queue:** `http://localhost:3000/staff/queue` (Advance orders from Preparation to Pickup).
- **Admin Management Portal:** `http://localhost:3000/admin` (Inventory adjustments, stock audits, user management).

*(Quick Login Tip: On the `/login` page, you can click the quick-login buttons to instantly test as **Customer**, **Staff**, or **Admin** without typing passwords).*

---

#### 3. Running the Mobile Application Individually (React Native Expo)

The mobile client is built with **Expo SDK 51** and delivers a native mobile customer experience with hardware-backed secure storage.

**Prerequisites & Network Configuration:**
1. Determine your computer's local Wi-Fi / LAN IP address:
   ```powershell
   ipconfig   # On Windows (look for IPv4 Address, e.g., 192.168.1.150)
   ```
2. Verify that `EXPO_PUBLIC_API_URL` in your `.env` points to your LAN IP:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3001/api/v1
   ```
   *(Ensure your physical mobile phone and development machine are connected to the same Wi-Fi network).*

**Execution Steps:**
```bash
# Start the Expo Metro bundler:
npm run dev:mobile

# (If you need to reset the bundler cache, run:)
npm run dev:mobile -- --clear
```

**How to Preview & Test the Mobile App:**
Once Metro starts, it will render an interactive QR code in your terminal:
- **Physical Phone (iOS & Android):**
  1. Install the free **Expo Go** application from Google Play Store or Apple App Store.
  2. Open your phone camera (iOS) or the Expo Go app (Android) and scan the terminal QR code.
  3. The JavaScript bundle will compile and stream directly onto your device!
- **Android Emulator:** Press `a` in the terminal to launch the app on an active Android Studio emulator.
- **iOS Simulator:** Press `i` in the terminal to launch on macOS Xcode iOS Simulator.
- **Web Browser Preview:** Press `w` in the terminal to immediately open a responsive browser preview.

---

### Component Summary Matrix

| Service | Technology | Port / Address | Command | Primary Function |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | NestJS 10 + Prisma | `http://localhost:3001` | `npm run dev:backend` | Core REST API, Auth, Database, Payments |
| **Web Frontend** | React 18 + Vite | `http://localhost:3000` | `npm run dev:web` | Customer Web App, Barista Queue, Admin Portal |
| **Mobile App** | React Native (Expo SDK 51) | `exp://<LAN_IP>:8081` | `npm run dev:mobile` | Native Mobile Ordering on iOS & Android |
| **Mock Gateway** | Node.js Express | `http://localhost:4000` | `npm run dev:mock` | External payment failure & timeout simulation |

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
