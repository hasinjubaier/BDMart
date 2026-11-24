# AGENTS.md — BD Mart Agent Operating Rules & Constraints

This document defines the strict engineering constraints, tech stack boundaries, and Do/Don't mandates for any AI agent or software engineer working in the **BD Mart** repository.

---

## 1. Tech Stack Boundaries

- **Language:** TypeScript (Strict mode enabled in `tsconfig.json`). Any usage of `any` or `@ts-ignore` is strictly prohibited. Use `@ts-expect-error` with a mandatory justifying comment only when strictly unavoidable.
- **Framework:** Next.js (App Router), React 19+. Default to React Server Components (RSC). Use `"use client"` exclusively for small, leaf-level interactive components.
- **Styling:** Tailwind CSS + shadcn/ui. Built using CSS design token variables (no hardcoded arbitrary pixel or hex values).
- **Database & Branching:** Neon (Serverless PostgreSQL). Ephemeral database branching per feature PR. All schema changes run on a dedicated Neon `dev` or test branch before `main`.
- **ORM:** Drizzle ORM + `drizzle-kit`. Type-safe migrations committed to Git (`drizzle/`). Raw SQL string concatenation is strictly prohibited; all queries must use Drizzle or parameterized SQL.
- **Authentication:** Firebase Authentication (Phone OTP + Google Auth). Client sends Firebase ID token to the server; server verifies via `firebase-admin` and sets an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie.
- **File & Media Storage:** Firebase Storage. Product images are public read with owner-only write. Sensitive documents (TIN, BIN, NID, Trade License) are in private buckets, accessible only to the document owner and Platform Admins via short-lived presigned URLs.
- **Validation:** Zod schemas are mandatory for all external inputs (forms, route parameters, search queries, webhooks, and AI outputs).
- **Forms:** React Hook Form + Zod resolver (`@hookform/resolvers/zod`).
- **State & Data Fetching:** Next.js Server Actions for mutations; TanStack Query (`@tanstack/react-query`) for interactive client-side caching and optimistic updates.
- **Payments:** SSLCommerz / aamarPay multi-gateway adapter pattern starting in Sandbox. Server-to-server IPN/webhook validation with mandatory `idempotency_key`. Never trust client redirects.
- **Courier Logistics:** Pathao / Steadfast logistics courier adapter pattern.
- **AI Integration:** Claude API invoked strictly server-side. Prompts versioned in `lib/ai/prompts/`. User inputs isolated from system instructions to prevent prompt injection. Outputs parsed and validated via Zod. Graceful fallback on AI outage or rate-limiting.
- **Testing:** Vitest for unit/integration tests; Playwright for desktop and mobile viewport E2E tests; `@axe-core/playwright` for automated WCAG accessibility audits.
- **Language & Localization:** English is the sole language for BD Mart's user interface, source code, comments, test descriptions, and project documentation. Default application locale is English ('en'). All UI copy, labels, placeholders, errors, and system messages are in English.
- **Financial Math:** All monetary amounts represented in integer **poisha** (paisa; 1 BDT = 100 poisha). Storing or calculating money in floating-point format (`float`/`double`) is strictly forbidden.
- **Timezone:** Timestamps stored in UTC in the database, rendered to users in `Asia/Dhaka` timezone.

---

## 2. Layering & Architectural Rules

Direct database access from UI components is strictly prohibited. The system enforces strict architectural layers:
```
UI Component (RSC / Client Component)
       ↓
Server Action / API Route Handler
       ↓
Service Layer (server/services/* - business logic, pricing, escrow, authorization)
       ↓
Database Layer (db/* - Drizzle queries and transactions)
```

1. **Authorization at the Boundary:** Every Server Action and Route Handler must invoke the server-side `requireRole([...])` helper at the very start of execution. Hiding buttons in the UI is never considered a security control.
2. **Resource Ownership Checks:** Sellers may only read, update, or delete their own products and orders (`seller_id = session.user.id`). Businesses can only access their own RFQs and purchase orders.
3. **Transactional Integrity:** All state transitions affecting orders, inventory stock reservations, payments, and escrow releases must occur inside atomic database transactions (`db.transaction()`).

---

## 3. Mandatory Agent Rules (Do / Don't)

### MUST DO (DO):
- Read the relevant documentation section and existing code before starting any implementation phase.
- Write Zod validation, server-side permission checks, and automated unit/integration tests for every feature.
- Execute order, stock, payment, and escrow state transitions inside database transactions.
- Re-verify webhook signatures via payment/courier gateway APIs and enforce idempotency.
- Optimize images using `next/image` with WebP/AVIF formats, responsive `sizes`, explicit `width`/`height`, and `priority` on above-the-fold heroes.
- Provide keyboard accessibility and ARIA screen reader attributes for all interactive elements.
- Summarize what was completed, what remains, and any assumptions made after every prompt.
- Stop and ask the product owner for clarification whenever requirements are ambiguous or contradictory.

### MUST NEVER DO (DON'T):
- Never commit secrets, API keys, private credentials, or passwords into source code, logs, or Git.
- Never trust client-supplied pricing, totals, quantities, or role claims. Recalculate everything on the server.
- Never concatenate raw strings into SQL queries.
- Never call Claude API or expose server-only credentials from client-side browser code.
- Never store KYC documents (NID, Trade License, TIN/BIN) in public storage buckets.
- Never use `any`, `eval()`, or unescaped `dangerouslySetInnerHTML`.
- Never install unapproved packages or untrusted dependencies without explicit justification.
- Never delete or skip failing tests to fake a "passing" status.
- Never run manual database schema migrations in production.
- Never build features supporting multi-level marketing (MLM), gambling, prohibited goods, or unlicensed pharmaceutical sales, in strict adherence to Bangladesh Digital Commerce Operation Guidelines (2021).
