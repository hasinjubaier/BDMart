# Architectural Decision Records (ADRs)

## ADR-001: Next.js App Router with Server Components by Default
- **Status:** Confirmed
- **Context:** BD Mart requires high SEO visibility for products, blazing-fast mobile initial loads in Bangladesh (frequently constrained by 3G/4G connections), and strict protection of business pricing logic.
- **Decision:** Use Next.js App Router. Enforce React Server Components (RSC) as the default architectural model. Use Client Components (`"use client"`) strictly for leaf-node interactive controls (e.g., cart quantity stepper, dropdown toggles).
- **Consequences:** Eliminates unnecessary client-side JavaScript bundle weight, satisfies Lighthouse Core Web Vitals targets (LCP < 2.5s), and ensures pricing calculations and database calls remain strictly server-side.

---

## ADR-002: Neon Serverless PostgreSQL with Drizzle ORM
- **Status:** Confirmed
- **Context:** The application requires strict relational constraints (ACID transactions for escrow, orders, and stock) combined with fast deployment velocity and branch-per-feature workflows.
- **Decision:** Use Neon Serverless PostgreSQL paired with Drizzle ORM.
- **Consequences:** 
  - Provides type-safe database schemas with zero runtime overhead.
  - Enables instant database branching for CI/CD pull request verification.
  - Raw SQL concatenation is forbidden; all queries use Drizzle's parameterized query builder.

---

## ADR-003: Firebase Authentication with Server Session Cookies
- **Status:** Confirmed
- **Context:** The primary sign-in mechanism in Bangladesh is mobile phone number with SMS OTP, supported by Google OAuth. Storing raw JWT tokens in browser `localStorage` exposes users to XSS token theft.
- **Decision:** Use Firebase Auth on the client to negotiate the SMS OTP or Google credential. The client sends the resulting ID token to an authentication Server Action, which verifies the token via `firebase-admin` and establishes a secure `HttpOnly`, `Secure`, `SameSite=Lax` session cookie.
- **Consequences:** Client-side JavaScript cannot read the session cookie, eliminating XSS token exfiltration risks while supporting seamless Next.js SSR session evaluation.

---

## ADR-004: Multi-Gateway Payment Adapter Pattern
- **Status:** Confirmed
- **Context:** Payment reliability in Bangladesh is subject to gateway downtimes or MFS maintenance windows. Hardcoding a single gateway creates a critical single point of failure.
- **Decision:** Implement a generic `PaymentGatewayAdapter` interface (`lib/payments/adapter.ts`) with interchangeable implementations for SSLCommerz and aamarPay.
- **Consequences:** The platform can dynamically switch primary payment gateways via configuration without rewriting checkout or webhook handling logic.

---

## ADR-005: 3PL Logistics Courier Adapter Pattern
- **Status:** Confirmed
- **Context:** BD Mart operates without its own delivery fleet, relying on established local courier networks (Pathao, Steadfast). Each courier provides different REST API structures and status names.
- **Decision:** Build a unified `CourierAdapter` abstraction that standardizes consignment booking, status polling, and incoming webhook parsing into a normalized state machine.
- **Consequences:** Adding new carriers (e.g., RedX, Paperfly) requires only implementing a single adapter file without touching order fulfillment logic.

---

## ADR-006: Mandatory Integer Poisha Standard for Monetary Data
- **Status:** Confirmed
- **Context:** Floating-point arithmetic (`0.1 + 0.2 === 0.30000000000000004`) introduces rounding inaccuracies that corrupt financial ledgers and fail accounting audits.
- **Decision:** Store and calculate all monetary quantities as integer **poisha** (`bigint` in PostgreSQL, `number` or `bigint` in TypeScript). Convert to formatted Taka (`৳`) strictly at the presentation layer using `formatBDT()`.
- **Consequences:** Guarantee 100% mathematical precision across all order subtotals, VAT breakdowns, platform commissions, and escrow disbursements.

---

## ADR-007: Runtime Architecture & Docker Exclusion
- **Status:** Confirmed (Updated by Owner Decision)
- **Context:** The original architectural proposal considered Docker containerization alongside serverless cloud targets.
- **Decision:** Docker and WSL are **strictly excluded** from BD Mart. The project runs directly on native Windows using PowerShell for local development, connects directly to Neon Serverless PostgreSQL, and targets serverless cloud builds (Firebase App Hosting / Vercel) for production.
- **Consequences:** Eliminates containerization overhead and complexity. Development relies exclusively on native Node.js LTS, pnpm, and PowerShell scripts. Dockerfiles and Compose files are not used.
