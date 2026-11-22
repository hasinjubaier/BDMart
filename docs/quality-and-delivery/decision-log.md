# Architectural and Business Decision Log

This document records the definitive status of all architectural, technical, and commercial decisions for BD Mart.

---

## 1. Confirmed Decisions (With Authoritative Sources)

| Decision ID | Decision Title | Status | Confirmed Choice | Authoritative Source |
|---|---|:---:|---|---|
| **DEC-001** | Multi-Vendor vs Single-Vendor | Confirmed | Multi-vendor marketplace. Independent KYC-verified sellers own inventory, set prices, and pack orders. | `BD_Mart_Agent_Build_Spec.md` §1, §4 |
| **DEC-002** | Primary Programming Language | Confirmed | TypeScript in strict mode (`tsconfig.json`). Any usage of `any` or `@ts-ignore` is forbidden. | `BD_Mart_Agent_Build_Spec.md` §2 |
| **DEC-003** | Core Framework | Confirmed | Next.js (App Router) with React Server Components (RSC) default. | `BD_Mart_Agent_Build_Spec.md` §2 |
| **DEC-004** | Design System & Styling | Confirmed | Tailwind CSS + shadcn/ui adhering to Bengal Commerce Core design tokens (Navy `#153B5B`, Green `#16A36A`). | `DESIGN.md`, `BD_Mart_Agent_Build_Spec.md` §2 |
| **DEC-005** | Database & Branching | Confirmed | Neon Serverless PostgreSQL with Drizzle ORM and ephemeral branching per feature PR. | `BD_Mart_Agent_Build_Spec.md` §2, §4 |
| **DEC-006** | Authentication Model | Confirmed | Firebase Auth (Phone OTP + Google) on client; server verification via `firebase-admin` with HttpOnly, Secure, SameSite=Lax session cookies. | `BD_Mart_Agent_Build_Spec.md` §2, §5 |
| **DEC-007** | Storage Architecture | Confirmed | Firebase Storage: Public bucket for product media; private bucket with admin-signed URLs for KYC files. | `BD_Mart_Agent_Build_Spec.md` §2, §5 |
| **DEC-008** | Monetary Math Precision | Confirmed | Integer **poisha** (`bigint`) for all prices, fees, taxes, and ledgers. Floating-point currency math is prohibited. | `BD_Mart_Agent_Build_Spec.md` §4, §7 |
| **DEC-009** | Language Localization | Confirmed | `next-intl` with Bengali (`bn`) as default and English (`en`) secondary. Zero hardcoded UI strings. | `BD_Mart_Agent_Build_Spec.md` §2, §7 |
| **DEC-010** | Upfront Delivery Pricing | Confirmed | Transparent upfront delivery calculation before checkout based on destination Upazila. Zero hidden fees. | `BD_Mart_Agent_Build_Spec.md` §1, §7 |
| **DEC-011** | Escrow Mechanism | Confirmed | Customer funds held in escrow ledger upon payment and released to seller only upon verified courier delivery. | `BD_Mart_Agent_Build_Spec.md` §1, §5 |
| **DEC-012** | Third-Party Logistics | Confirmed | Adapter pattern integrating Pathao Courier and Steadfast Courier APIs. No proprietary fleet in Phase 1. | `BD_Mart_Agent_Build_Spec.md` §1, §2 |
| **DEC-013** | Hosting Strategy | Confirmed & Reconciled | Serverless Cloud (Firebase App Hosting / Vercel) for production deployment; multi-stage Dockerfile and Docker Compose for reproducible local/self-hosted development. | `BD_Mart_Agent_Build_Spec.md` §2, §13 |

---

## 2. Pending Product Owner Decisions

The following commercial and operational policies require explicit confirmation or authorization from the Product Owner:

### Decision OPD-001: Platform Commission Rates
- **Question:** What standard commission percentages should BD Mart deduct from sellers upon successful escrow release?
- **Viable Options:**
  - *Option A (Recommended):* Tiered category rates — **5.0% for retail (B2C)** sales, **2.0% for bulk wholesale (B2B)** transactions.
  - *Option B:* Flat 4.0% across all transactions regardless of volume.
  - *Option C:* Zero platform commission during launch promotional phase (first 90 days), transitioning to Option A thereafter.
- **Architectural Rationale:** Option A reflects international marketplace economics: high-frequency retail accommodates a 5% margin, while large B2B wholesale transactions (e.g., ৳100,000+) require lower commission percentages (2%) to prevent disintermediation.
- **Affected Modules:** `src/server/services/escrow.ts`, `sellers.commission_rate` default value.

### Decision OPD-002: Customer Dispute Window Limit
- **Question:** How many calendar days should buyers be allowed to inspect goods and raise a dispute post-delivery before escrow automatically releases to the seller?
- **Viable Options:**
  - *Option A (Recommended):* **7 calendar days** (Standard e-commerce guideline in Bangladesh).
  - *Option B:* **3 calendar days** (Accelerates cash flow to sellers, but increases buyer friction if defects appear late).
  - *Option C:* **14 calendar days** (Highly buyer-friendly, but creates seller liquidity complaints).
- **Architectural Rationale:** Option A balances seller working capital requirements with Bangladesh Digital Commerce Guidelines (2021) compliance.
- **Affected Modules:** Escrow automated cron release scheduler, `disputes` submission validation action.

### Decision OPD-003: Value Added Tax (VAT) Presentation Model
- **Question:** Should listed product prices be displayed inclusive or exclusive of the 15% VAT on the retail storefront?
- **Viable Options:**
  - *Option A (Recommended):* **VAT-Inclusive for Retail (B2C)**, **VAT-Itemized for Wholesale (B2B)**.
  - *Option B:* VAT-Exclusive everywhere, added at checkout summary.
- **Architectural Rationale:** Option A satisfies consumer expectations in Bangladesh (buyers expect the price tag to reflect total out-of-pocket cost), while business buyers require transparent tax itemization for tax input credit filing.
- **Affected Modules:** `src/components/commerce/price-display.tsx`, cart summary math, PDF invoice generator.
