# BD Mart

> **The Trusted Dual-Engine E-Commerce Marketplace for Bangladesh (B2C Retail & B2B Wholesale)**

---

## Current Status & Phase
**Current Phase:** Phase 0 Completed (Native Windows Setup with Neon PostgreSQL)  
**Repository State:** Scaffolding complete with Next.js 15, React 19, strict TypeScript, Drizzle ORM, Neon serverless client, and localized pre-implementation documentation.  
**Runtime Architecture:** Native Windows via PowerShell. Docker and WSL are explicitly excluded per Owner Decision.  
**Database:** Neon Serverless PostgreSQL (`development` branch verified).

---

## 1. Prerequisites (Native Windows)
Ensure the following tools are installed directly on Windows:
- **Node.js:** v20+ LTS (Tested on Node `v24.21.0`)
- **Package Manager:** `pnpm` v10+ (Tested on `pnpm v12.18.0`). If not installed:
  ```powershell
  corepack enable
  corepack prepare pnpm@latest --activate
  ```
- **Database:** An active Neon PostgreSQL database project. (Development branch connection string in `.env.local`).

---

## 2. Quickstart Instructions (PowerShell)

All commands must be executed from the repository root (`D:\Project\BDMart`) in Windows PowerShell.

### Step 1: Install Dependencies
```powershell
pnpm install
```

### Step 2: Environment Configuration
Copy the template configuration to your local private environment:
```powershell
Copy-Item .env.example .env.local
```
Edit `.env.local` to provide your designated Neon development connection string:
```env
DATABASE_URL=postgres://neondb_owner:your_password@ep-your-dev-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```
*(Note: `.env.local` is strictly ignored by Git. Never commit real credentials to source control).*

### Step 3: Run Code Quality Checks
Verify formatting, linting, and strict TypeScript types:
```powershell
pnpm typecheck
pnpm lint
pnpm build
```

### Step 4: Start the Application
Run the local development server:
```powershell
pnpm dev
```
Or start the optimized production build:
```powershell
pnpm start
```

### Step 5: Open in Browser
Open your browser and navigate to:
```text
http://localhost:3000
```
*(If port 3000 is occupied, Next.js will automatically select an available port such as 3001, printed in the console).*

### Step 6: Stop the Application
To terminate the running server in PowerShell:
Press `Ctrl + C`, then type `Y` to confirm terminating the batch job.

---

## 3. Technology Stack Snapshot
- **Core Framework:** Next.js 15 (App Router, Server Components by default) & React 19
- **Language:** TypeScript in strict mode (`strict: true`, no `any` permitted)
- **Database & ORM:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) + Drizzle ORM
- **Runtime Environment:** Native Windows (PowerShell) — *Docker excluded*
- **Authentication:** Firebase Authentication (Phone OTP & Google Auth) — *Phase 1*
- **Storage:** Firebase Storage (Product media and private KYC buckets) — *Phase 1*
- **Payments & Escrow:** SSLCommerz / aamarPay gateway adapter with atomic escrow ledger — *Phase 5*
- **Logistics:** Pathao & Steadfast courier adapter pattern — *Phase 5*
- **Localization:** `next-intl` (Bengali `bn` default, English `en`)
- **Financial Arithmetic:** Integer **poisha** (1 BDT = 100 poisha)

---

## 4. Documentation Navigation
All technical, commercial, data, security, and quality specifications are cataloged in [`docs/`](file:///d:/Project/BDMart/docs/README.md):

| Category | Location | Summary |
|---|---|---|
| **Master Index** | [docs/README.md](file:///d:/Project/BDMart/docs/README.md) | Central entry point and role-based reading orders. |
| **Product** | [docs/product/](file:///d:/Project/BDMart/docs/product/README.md) | Vision, scope boundaries, actors & roles, requirements matrix. |
| **Commerce** | [docs/commerce/](file:///d:/Project/BDMart/docs/commerce/README.md) | Dual pricing, catalog, checkout, escrow ledger, B2B RFQ engine. |
| **UI/UX** | [docs/ux/](file:///d:/Project/BDMart/docs/ux/README.md) | Sitemap, Bengal Commerce Core design tokens, screen catalog. |
| **Architecture** | [docs/architecture/](file:///d:/Project/BDMart/docs/architecture/README.md) | C4 diagrams, ADRs (ADR-001 through ADR-007), layer boundaries. |
| **Data & API** | [docs/data-and-api/](file:///d:/Project/BDMart/docs/data-and-api/README.md) | PostgreSQL schema, Zod API contracts, state machines, idempotency. |
| **Security & Privacy** | [docs/security-and-privacy/](file:///d:/Project/BDMart/docs/security-and-privacy/README.md) | RBAC matrix, tenant isolation, KYC private bucket controls. |
| **Operations** | [docs/operations/](file:///d:/Project/BDMart/docs/operations/README.md) | Native Windows runtime setup, secrets, CI/CD, runbooks. |
| **Quality & Delivery** | [docs/quality-and-delivery/](file:///d:/Project/BDMart/docs/quality-and-delivery/README.md) | End-to-end purchase walkthroughs, traceability, decision log. |

For agent constraints and rules, see [AGENTS.md](file:///d:/Project/BDMart/AGENTS.md).
