# Data and API Documentation — Category Overview

## Purpose
The `data-and-api/` category specifies the physical database architecture, Drizzle schema, entity relationships, API and Server Action contracts, deterministic finite state machines, and concurrency/idempotency controls for BD Mart.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [database-schema.md](file:///d:/Project/BDMart/docs/data-and-api/database-schema.md) | PostgreSQL table structures, data types, indexes, foreign keys, and Drizzle migration workflow. | Data Architect / DBA |
| [api-contracts.md](file:///d:/Project/BDMart/docs/data-and-api/api-contracts.md) | Server Action interfaces, REST route handlers, Zod request/response validation schemas, and error codes. | Full-Stack Architect / Backend Lead |
| [state-machines.md](file:///d:/Project/BDMart/docs/data-and-api/state-machines.md) | Formal state machines and transition matrices for Orders, Payments, Escrow, RFQs, Disputes, and KYC. | Systems Analyst / QA Lead |
| [concurrency-and-idempotency.md](file:///d:/Project/BDMart/docs/data-and-api/concurrency-and-idempotency.md) | Stock reservation locking (`SELECT FOR UPDATE`), webhook idempotency keys, and duplicate payment resolution. | Senior Backend Engineer / Security Lead |

---

## When Each Document is Useful
- Use **`database-schema.md`** when creating or modifying Drizzle schema files in `src/db/schema/*` or generating migrations via `drizzle-kit`.
- Use **`api-contracts.md`** when creating Next.js Server Actions, Zod validators (`src/lib/validators/*`), or webhook route handlers.
- Use **`state-machines.md`** when implementing status transitions in domain services or writing state validation tests.
- Use **`concurrency-and-idempotency.md`** when designing checkout concurrency, stock reservation transactions, or payment webhook consumers.

---

## Dependencies & Open Decisions
- **Dependencies:** Translates business rules from [docs/commerce/](file:///d:/Project/BDMart/docs/commerce/README.md) into concrete database schemas and API interfaces. Informs [docs/security-and-privacy/](file:///d:/Project/BDMart/docs/security-and-privacy/README.md) and [docs/quality-and-delivery/](file:///d:/Project/BDMart/docs/quality-and-delivery/README.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding cart persistence strategy for anonymous guests (localStorage vs database-backed session token).
