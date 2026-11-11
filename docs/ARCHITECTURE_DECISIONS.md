# Architecture Decision Records (ADRs)

This document records the foundational architectural decisions for the BDMart marketplace. Every decision documents the technical context, evaluated alternatives, the final decision, and its long-term consequences.

---

## Index of Architecture Decision Records

- [ADR-001: Modular Monolith Architecture vs. Microservices](#adr-001-modular-monolith-architecture-vs-microservices)
- [ADR-002: TypeScript Monorepo Architecture with pnpm Workspaces](#adr-002-typescript-monorepo-architecture-with-pnpm-workspaces)
- [ADR-003: Managed Serverless PostgreSQL (Neon) vs. Self-Hosted / Local Database](#adr-003-managed-serverless-postgresql-neon-vs-self-hosted--local-database)
- [ADR-004: Prisma ORM for Schema Migrations and Type-Safe Data Access](#adr-004-prisma-orm-for-schema-migrations-and-type-safe-data-access)
- [ADR-005: Cloudflare R2 for Object Storage with Direct Presigned Client Uploads](#adr-005-cloudflare-r2-for-object-storage-with-direct-presigned-client-uploads)
- [ADR-006: React Native + Expo with Cloud EAS Builds for Cross-Platform Mobile](#adr-006-react-native--expo-with-cloud-eas-builds-for-cross-platform-mobile)
- [ADR-007: Unified Next.js Web Application with App Router Route Groups](#adr-007-unified-nextjs-web-application-with-app-router-route-groups)
- [ADR-008: PostgreSQL Native Full-Text Search for MVP Launch vs. External Search Clusters](#adr-008-postgresql-native-full-text-search-for-mvp-launch-vs-external-search-clusters)
- [ADR-009: Zero-Docker Local Development Constraint for Windows Host](#adr-009-zero-docker-local-development-constraint-for-windows-host)
- [ADR-010: Exact Monetary Representation in Integer Paisa (BDT)](#adr-010-exact-monetary-representation-in-integer-paisa-bdt)
- [ADR-011: Decoupling Canonical Products from Multi-Seller Listings](#adr-011-decoupling-canonical-products-from-multi-seller-listings)
- [ADR-012: Parent Order and Multi-Seller Sub-Order Splitting Pattern](#adr-012-parent-order-and-multi-seller-sub-order-splitting-pattern)
- [ADR-013: Strict Server-to-Server IPN Re-Verification for Payment Processing](#adr-013-strict-server-to-server-ipn-re-verification-for-payment-processing)
- [ADR-014: Regulatory Separation of Platform Ledger from Licensed Stored-Value Wallets](#adr-014-regulatory-separation-of-platform-ledger-from-licensed-stored-value-wallets)
- [ADR-015: Pinned Stable Technology Baseline (Node.js 24 LTS, Next.js 16, Expo SDK 54, NestJS 11, Prisma 6)](#adr-015-pinned-stable-technology-baseline)
- [ADR-016: Modern Neon Driver Adapter & `prisma.config.ts` Multi-URL Architecture](#adr-016-modern-neon-driver-adapter--prismaconfigts-multi-url-architecture)
- [ADR-017: Multi-Supplier RFQ Sourcing and Independent Seller Quotations Model](#adr-017-multi-supplier-rfq-sourcing-and-independent-seller-quotations-model)
- [ADR-018: Strict Separation of B2B Wholesale Procurement and B2C Consumer Carts & Orders](#adr-018-strict-separation-of-b2b-wholesale-procurement-and-b2c-consumer-carts--orders)
- [ADR-019: Distributed Job Locking via Native PostgreSQL Advisory Locks (Zero-Redis Multi-Instance Safety)](#adr-019-distributed-job-locking-via-native-postgresql-advisory-locks)
- [ADR-020: Transactional Outbox Pattern for Resilient Event & Notification Dispatch](#adr-020-transactional-outbox-pattern-for-resilient-event--notification-dispatch)
- [ADR-021: Distinction Between Bangladesh Statutory Regulations vs. Platform Risk Policies](#adr-021-distinction-between-bangladesh-statutory-regulations-vs-platform-risk-policies)

---

## ADR-001: Modular Monolith Architecture vs. Microservices

### Status
**Accepted**

### Context
A marketplace platform requires catalog management, inventory tracking, shopping cart, multi-seller checkout, payment settlement, courier logistics, and verification. While tech giants operate microservices, early-stage systems with microservices suffer from severe distributed transaction overhead (Sagas, two-phase commits), network latency, complex observability requirements, high deployment costs, and operational fragility.

### Alternatives Considered
1. **Distributed Microservices (NestJS microservices / gRPC / Kafka):** High operational complexity, requires multiple deployments, difficult local development on Windows without Docker, and introduces eventual consistency challenges across inventory and orders.
2. **Traditional Unstructured Monolith:** Fast to prototype, but leads to "spaghetti code" where modules tightly couple to each other's database tables, creating a fragile codebase.
3. **Modular Monolith (Selected):** A single deployable application structured into strictly bounded business modules, communicating via explicit interfaces and in-process events, sharing a single relational database with clean schema boundaries.

### Decision
We will build the BDMart backend as a **Modular Monolith** using NestJS. Modules will own their database entities and logic. Cross-module calls will occur strictly through injected domain services or in-process domain events.

### Consequences
- **Positive:** Single deployment target (Render Node.js service), simple local development without Docker, full ACID database transaction guarantees across orders and inventory reservations, and zero distributed network overhead.
- **Negative:** Requires strong code review discipline to prevent circular module dependencies and unauthorized database cross-queries.

---

## ADR-002: TypeScript Monorepo Architecture with pnpm Workspaces

### Status
**Accepted**

### Context
BDMart comprises mobile apps (iOS & Android), a public web storefront, seller/admin portals, a backend API, and shared logic (Zod validation schemas, API contracts, TypeScript types, utilities). Maintaining separate repositories leads to schema drift, duplicated DTOs, and out-of-sync API contracts between frontend and backend.

### Alternatives Considered
1. **Polyrepo (Separate git repos for Mobile, Web, API, and Packages):** Requires publishing private npm packages for shared types, adding CI/CD delays and versioning overhead.
2. **Monorepo with npm/yarn:** Poor disk space performance, slow dependency deduplication, and nested `node_modules`.
3. **Monorepo with pnpm Workspaces (Selected):** Content-addressable storage saves gigabytes of disk space on Windows by hardlinking identical packages.

### Decision
Adopt a single Git repository structured with **pnpm workspaces** and Turborepo. Shared API contracts, validation schemas (Zod), and utility functions will live in `packages/` and be imported directly into `apps/api`, `apps/web`, and `apps/mobile`.

### Consequences
- **Positive:** End-to-end type safety from database to mobile screen. Refactoring an API request schema immediately surfaces compile errors across web and mobile clients. pnpm optimizes Windows disk usage.
- **Negative:** Monorepos require unified CI pipelines and careful dependency scoping to ensure web packages don't accidentally pull in backend-only code.

---

## ADR-003: Managed Serverless PostgreSQL (Neon) vs. Self-Hosted / Local Database

### Status
**Accepted**

### Context
The developer environment is a Windows PC with constrained disk space and a strict **No Docker** mandate. Installing local PostgreSQL creates background services and local storage overhead. The production environment demands high availability, point-in-time recovery, and automated connection pooling.

### Alternatives Considered
1. **Local PostgreSQL on Windows:** Consumes local disk space, requires local service management, and differs from cloud production environments.
2. **AWS RDS / Cloud SQL:** Fixed hourly cost even when idle, complex VPC peering, requires local bastion/tunnel.
3. **Neon Serverless PostgreSQL (Selected):** Serverless architecture with separation of compute and storage. Features built-in pgBouncer connection pooling (`DATABASE_URL`), instant branch creation for isolated testing/staging, zero local disk footprint, and automated backups.

### Decision
Use **Neon managed PostgreSQL** as the exclusive database across development, staging, and production. Developers connect to cloud branches directly over TLS.

### Consequences
- **Positive:** Zero local database installation, zero local disk consumed, production-grade pgBouncer connection pool out of the box, instant database branching for PR testing.
- **Negative:** Requires an active internet connection for local development. Handled cleanly with low-latency broadband.

---

## ADR-004: Prisma ORM for Schema Migrations and Type-Safe Data Access

### Status
**Accepted**

### Context
The platform requires a normalized schema of 40+ tables with strict foreign keys, unique constraints, and high relational complexity. We need type-safe queries in NestJS and reliable, version-controlled schema migrations.

### Alternatives Considered
1. **TypeORM:** Historical popularity in NestJS, but plagued by unstable migration tooling, loose type inference, and active maintenance concerns.
2. **Drizzle ORM:** Excellent lightweight SQL-like syntax, but migration ecosystem is less mature for complex enterprise workflows.
3. **Prisma ORM (Selected):** Industry-standard declarative `schema.prisma`, automatic generation of fully typed TypeScript client, reliable migration runner (`prisma migrate`), and seamless integration with NestJS.

### Decision
Adopt **Prisma ORM**. All database schema modifications must be committed as Prisma migrations. The migration runner will use Neon’s direct unpooled connection string, while the application runtime connects via the pooled connection.

### Consequences
- **Positive:** Complete type safety across all queries. Catches broken relational assumptions at compile time. Declarative schema acts as self-documenting blueprint.
- **Negative:** Prisma engine binaries add a small build artifact size (~25MB). Addressed by optimizing `.gitignore` and build caches.

---

## ADR-005: Cloudflare R2 for Object Storage with Direct Presigned Client Uploads

### Status
**Accepted**

### Context
Marketplaces process high volumes of product images, business verification PDFs (Trade Licenses, e-TIN), and legal documents. Storing binaries in PostgreSQL slows backups and bloats storage. Traditional cloud storage (AWS S3) incurs significant data egress fees.

### Alternatives Considered
1. **Local Filesystem / Node.js Multer Upload:** Consumes local server disk space, creates single point of failure, does not scale horizontally.
2. **Amazon S3:** High data transfer (egress) costs for high-resolution product imagery.
3. **Cloudflare R2 (Selected):** Zero egress fees, S3-compatible API, global CDN distribution, seamless integration with AWS S3 SDK for generating presigned URLs.

### Decision
Use **Cloudflare R2**. Clients request a short-lived presigned PUT URL from the NestJS API, then upload binaries directly to R2. The backend never handles raw file streams in memory, preserving server throughput.

### Consequences
- **Positive:** Zero server bandwidth consumed by uploads, zero egress fees, unlimited scalability, clean separation of metadata (DB) from binary objects (R2).
- **Negative:** Requires two-step upload confirmation: client uploads to R2, then informs the backend API to validate and link the uploaded key.

---

## ADR-006: React Native + Expo with Cloud EAS Builds for Cross-Platform Mobile

### Status
**Accepted**

### Context
The business requires native Android and iOS mobile applications. The developer is on a Windows PC without a Mac, has limited disk space, and cannot install heavy Android Studio emulators or Xcode.

### Alternatives Considered
1. **Separate Native Android (Kotlin) & iOS (Swift):** Doubles development cost, impossible to build iOS locally on Windows.
2. **Flutter:** Excellent cross-platform UI, but requires learning Dart and diverges from the TypeScript monorepo strategy.
3. **React Native with Pure CLI:** Requires full Android Studio toolchains, local SDKs (15GB+), and local virtual devices.
4. **React Native + Expo with EAS Cloud Builds (Selected):** Written in TypeScript, shares contracts with Web and Backend, tests immediately on physical Android devices via Expo Go / development builds, and builds production AAB/IPA binaries in the cloud via Expo Application Services (EAS).

### Decision
Adopt **React Native + Expo (TypeScript)** using stable Expo SDK 54 and integrated Expo Router. Cloud compilation occurs via `EAS Build`.

### Consequences
- **Positive:** Enables building and submitting iOS and Android apps from a Windows machine without local heavy SDKs. Reuses TypeScript models and validation logic.
- **Negative:** EAS free tier has monthly build queues. High-priority release builds may require paid EAS tier.

---

## ADR-007: Unified Next.js Web Application with App Router Route Groups

### Status
**Accepted**

### Context
We must deliver three distinct web experiences: (1) Public consumer/retail storefront with high SEO requirements, (2) Seller portal for inventory and order fulfillment, and (3) Internal Admin dashboard for platform moderation and finance.

### Alternatives Considered
1. **Three Separate Web Apps (Three Next.js deployments):** Triples deployment count, increases build times, and duplicates common UI components.
2. **Single Next.js App with Route Groups (Selected):** A single Next.js project using App Router route groups: `app/(storefront)`, `app/(seller)`, and `app/(admin)`. Shares UI primitives, design tokens, and authentication middleware while maintaining isolated layouts and route protections.

### Decision
Build a single Next.js 16 Active LTS web application deployed to Vercel, utilizing route groups for storefront, seller portal, and admin portal.

### Consequences
- **Positive:** Single deployment pipeline, shared Tailwind configuration and shadcn/ui components, simplified codebase navigation.
- **Negative:** Requires strict route-level middleware to ensure administrative and seller routes are inaccessible to unauthenticated or unauthorized users.

---

## ADR-008: PostgreSQL Native Full-Text Search for MVP Launch vs. External Search Clusters

### Status
**Accepted**

### Context
E-commerce relies heavily on product discovery. Operating external search clusters (Elasticsearch, OpenSearch) requires heavy Java processes, large RAM footprints, and complex dual-write synchronization pipelines.

### Alternatives Considered
1. **Elasticsearch / OpenSearch:** Powerful, but complex to maintain, expensive to host, and violates the zero-local-container development requirement.
2. **Algolia / Typesense Cloud:** Excellent managed search, but introduces SaaS vendor costs and data synchronization overhead before product-market fit.
3. **PostgreSQL Native Full-Text Search + GIN Indexes (Selected):** Leverages `tsvector`, `tsquery`, GIN indexing, and `pg_trgm` for trigram similarity and fuzzy matching directly inside Neon PostgreSQL.

### Decision
Use **PostgreSQL Full-Text Search with GIN indexes and trigram fuzzy matching** for Phase 1 & 2 launch. Migrate to a managed search engine (Typesense Cloud) only when SKU count exceeds 50,000 or search query latency warrants dedicated search infrastructure.

### Consequences
- **Positive:** Zero additional infrastructure, instant consistency (no search sync lag), zero added hosting cost.
- **Negative:** Complex search ranking algorithms, faceted search on 100+ dynamic attributes, and Bengali stemming are less sophisticated than dedicated search engines.

---

## ADR-009: Zero-Docker Local Development Constraint for Windows Host

### Status
**Accepted**

### Context
The developer's Windows PC has limited free disk space and does not have Docker Desktop installed. Installing WSL2 and Docker Desktop consumes 20GB+ of disk space and degrades performance.

### Decision
The entire architecture must remain **100% runnable, testable, and developable without Docker or local container runtimes**.
- Local execution runs native Node.js processes (`pnpm --filter api dev`, `pnpm --filter web dev`, `pnpm --filter mobile start`).
- All stateful infrastructure (PostgreSQL, Object Storage, Cloud Builds) is delegated to cloud providers (Neon, Cloudflare R2, Expo EAS).

### Consequences
- **Positive:** Ultra-lean disk footprint, rapid boot times, zero hypervisor memory reservation on Windows.
- **Negative:** Integration tests run against real cloud database branches rather than ephemeral local Docker containers.

---

## ADR-010: Exact Monetary Representation in Integer Paisa (BDT)

### Status
**Accepted**

### Context
Marketplace transactions involve wholesale tier calculations, percentage commissions, VAT deductions, delivery subsidies, and partial refunds. Floating-point arithmetic (`0.1 + 0.2 = 0.30000000000000004`) causes severe financial discrepancies and audit failures.

### Alternatives Considered
1. **IEEE 754 Floating-Point (`Float` in Prisma):** Unacceptable for financial ledgers due to rounding errors.
2. **Fixed-Point Decimal (`Decimal(12,2)` in PostgreSQL):** Supported by PostgreSQL and Prisma, but can cause precision issues during serialization across REST APIs.
3. **Integer Paisa (Selected):** 1 Bangladeshi Taka (BDT) = 100 Paisa. All amounts are stored as integers (`BigInt` / `Int`). ৳1,500.50 is stored as `150050`.

### Decision
All monetary values across the database, DTOs, calculations, and APIs will be stored and transmitted as **Integer Paisa** in currency **BDT**. Conversions to display strings (e.g., `৳1,500.50`) occur strictly at the presentation layer using shared utility formatters.

### Consequences
- **Positive:** Mathematically exact arithmetic, zero rounding drift, seamless compatibility with payment gateway payloads (SSLCOMMERZ, bKash).
- **Negative:** Developers must remember that `100` represents ৳1.00. Enforced via strong TypeScript branded types (`type Paisa = number`).

---

## ADR-011: Decoupling Canonical Products from Multi-Seller Listings

### Status
**Accepted**

### Context
In B2B and B2C marketplaces, multiple sellers often sell the identical physical product (e.g., Samsung Galaxy A15 or Akij Cement 50kg bag). If every seller creates an independent product, the catalog becomes flooded with duplicate items, fragmenting customer reviews, search rankings, and category browsing.

### Alternatives Considered
1. **Single Flat Product Table (Shopify style):** Every seller creates their own isolated product. Results in massive catalog duplication and poor comparison shopping.
2. **Canonical Master Catalog + Multi-Tenant Seller Listings (Amazon/Alibaba style - Selected):** A canonical product record (`products`) defines the brand, model, standardized specifications, barcode, and media. Sellers attach their own `seller_listings` to that canonical product, defining their specific stock, retail price, wholesale price tiers, MOQ, and warehouse location.

### Decision
Decouple **Canonical Products** from **Seller Listings**. Multiple sellers can offer the same canonical variant with independent pricing and inventory.

### Consequences
- **Positive:** Clean catalog structure, seamless price comparison for buyers, aggregate review scores across a single product, structured import validation.
- **Negative:** Requires a catalog moderation workflow to verify that new seller listing submissions match existing canonical items.

---

## ADR-012: Parent Order and Multi-Seller Sub-Order Splitting Pattern

### Status
**Accepted**

### Context
A consumer or business buyer can add products from multiple different sellers into a single shopping cart. If the checkout creates a single flat order, partial fulfillments, independent courier dispatch, seller-specific cancellations, and individual payouts become mathematically and operationally entangled.

### Alternatives Considered
1. **Single Flat Order with Multi-Seller Items:** Impossible to assign independent shipping tracking numbers, handle partial cancellations, or track dispute statuses per seller.
2. **Restricting Cart to Single Seller:** Frustrates buyers who want to purchase from multiple suppliers in one session.
3. **Parent Order with Seller Sub-Orders (Selected):** The checkout creates one `Order` (Parent) representing the financial transaction and customer commitment, and automatically splits into multiple `SellerOrder` records (Sub-orders), one for each participating seller.

### Decision
Implement the **Parent Order / Seller Sub-Order Pattern**. Each `SellerOrder` has its own status machine, shipment tracking, cancellation lifecycle, and payout settlement entry.

### Consequences
- **Positive:** Sellers manage only their portion of the order; logistics partners track distinct packages; cancellations by Seller A do not disrupt Seller B; customer receives a single combined invoice and payment charge.
- **Negative:** Increased schema complexity and more intricate status rollup logic (e.g., Parent Order is `PARTIALLY_SHIPPED` if one Sub-order is dispatched and another is pending).

---

## ADR-013: Strict Server-to-Server IPN Re-Verification for Payment Processing

### Status
**Accepted**

### Context
Payment gateways (SSLCOMMERZ, bKash) return the customer to a frontend return URL upon transaction completion. Malicious users can spoof browser query parameters (e.g., `?status=VALID&tran_id=fake123`) to fraudulently mark orders as paid.

### Decision
1. **Browser redirects are purely presentational:** A browser callback will never mark an order as `PAID`.
2. **Instant Payment Notification (IPN) / Webhook:** The payment gateway notifies the backend API via an asynchronous server-to-server POST request.
3. **Server-Side Re-Verification:** Upon receiving the webhook, the NestJS `PaymentsModule` calls the gateway's server-side validation API (e.g., SSLCOMMERZ Order Validation API) using private merchant credentials.
4. **Idempotent Execution:** Webhooks verify transaction amount, currency, and internal order reference before executing an atomic state transition. Duplicate webhooks are acknowledged but ignored.

### Consequences
- **Positive:** Zero risk of client-side payment spoofing. Complete immunity to duplicate webhook race conditions.
- **Negative:** Requires robust outbound network connectivity to payment gateway validation endpoints.

---

## ADR-014: Regulatory Separation of Platform Ledger from Licensed Stored-Value Wallets

### Status
**Accepted**

### Context
Under Bangladesh Bank regulations, operating a stored-value customer digital wallet where users deposit, hold, and withdraw funds requires a formal Payment Service Provider (PSP) or Payment System Operator (PSO) license. Unlicensed platforms operating "wallet balances" face severe regulatory shutdown.

### Alternatives Considered
1. **In-House Customer Wallet Balance:** Store prepaid funds for customers. **High legal risk** under Bangladesh Bank circulars.
2. **Internal Double-Entry Merchant Ledger (Selected):** Maintain an accounting ledger recording receivables, platform commissions, courier fees, and seller earnings. Sellers withdraw funds directly to their verified commercial bank accounts via scheduled BEFTN/NPSB payouts. No stored-value consumer wallet is offered.

### Decision
BDMart will **not** operate a consumer stored-value wallet. All consumer refunds are returned directly to the originating payment source (MFS account or credit card) or issued as non-withdrawable promotional store credits. The `seller_wallets` table will operate strictly as an **internal accounting settlement ledger**, not a banking deposit facility.

### Consequences
- **Positive:** Full compliance with Bangladesh Bank and Ministry of Commerce regulations. Zero banking licensing exposure.
- **Negative:** Refunds to card/MFS take 5–10 business days depending on gateway rails, requiring clear communication to consumers.

---

## ADR-015: Pinned Stable Technology Baseline

### Status
**Accepted**

### Context
Milestone 0 cited open-ended versions (e.g., "Node.js LTS", "Next.js 15", "Expo SDK 51+", "Expo Router v3"). Unpinned or mismatched dependencies cause silent runtime incompatibilities, peer dependency conflicts, and build failures.

### Evaluated Versions
- **Node.js:** Node.js 24 LTS ("Krypton") is the active LTS baseline. Fully supported by NestJS 11+, Next.js 16+, Prisma 6+, and modern pnpm.
- **Next.js:** Next.js 16 Active LTS (v16.4.x) with React 19.3.
- **React & React Native:** React 19 (aligned across Next.js 16 and React Native 0.79+).
- **Expo SDK & Router:** Expo SDK 54 with matching integrated Expo Router v54.
- **NestJS:** NestJS 11.x (Node.js 20+ requirement satisfied by Node.js 24 LTS).
- **Prisma ORM:** Prisma 6.x with `@prisma/adapter-neon`.
- **Package Manager:** pnpm 9.x / 10.x with Turborepo 2.x.
- **Styling:** Tailwind CSS v4.
- **TypeScript:** TypeScript 5.7+.

### Decision
Pin all dependencies to this exact stable baseline. No alpha, beta, or canary releases are permitted.

### Consequences
- **Positive:** Guarantees reproducible builds across developer machines and cloud deployment runners.
- **Negative:** Upgrading any major framework in the future requires coordinated monorepo-wide peer dependency audits.

---

## ADR-016: Modern Neon Driver Adapter & `prisma.config.ts` Multi-URL Architecture

### Status
**Accepted**

### Context
In modern Prisma ORM (v6+), database connection strings for CLI migrations cannot rely on legacy `directUrl` flags in `schema.prisma`. Neon requires two distinct connection strings: (1) a pooled connection via pgBouncer with `-pooler` in the host for application traffic, and (2) an unpooled direct connection for DDL migrations.

### Decision
1. **Runtime Traffic (`DATABASE_URL`):** Connects to `postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require` via `@prisma/adapter-neon` and `PrismaNeon`.
2. **CLI Migrations (`DATABASE_URL_UNPOOLED`):** Connects to `postgresql://[user]:[password]@[endpoint].[region].aws.neon.tech/[dbname]?sslmode=require` declared in `prisma.config.ts`.
3. **No Assumed Port Hardcoding:** Ports are never assumed or hardcoded; URLs strictly reflect the authoritative Neon dashboard connection strings over TLS.

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
```

### Consequences
- **Positive:** Complies with current official Prisma 6 and Neon documentation; zero connection exhaustion during traffic spikes; zero migration failures on pooler.
- **Negative:** Requires maintaining two distinct connection environment variables in server secrets.

---

## ADR-017: Multi-Supplier RFQ Sourcing and Independent Seller Quotations Model

### Status
**Accepted**

### Context
The original Milestone 0 schema combined the buyer's Request for Quotation (RFQ) and the supplier's quotation into a single table (`quotations`). This assumed an RFQ was 1:1 with a single seller. In wholesale commerce, a business buyer frequently creates one RFQ and broadcasts it to multiple eligible suppliers or solicits competing bids.

### Decision
Decouple buyer requests from supplier responses:
1. **`rfq_requests` & `rfq_request_items`:** Owned by the buyer business. Declares specifications, quantities, and target delivery timelines.
2. **`rfq_target_sellers`:** Tracks sellers invited to or eligible for the RFQ.
3. **`seller_quotations` & `seller_quotation_items`:** Owned by individual suppliers. Represents an independent commercial offer with validity expiry and pricing.
4. **Quotation Acceptance Workflow:** When the buyer accepts one supplier quotation, that quotation is marked `ACCEPTED`, competing quotations are marked `REJECTED`, and the accepted quotation atomically converts into a draft B2B Order.

### Consequences
- **Positive:** Models real-world wholesale procurement accurately; enables competitive bidding and quotation comparison for buyers.
- **Negative:** Increases relational complexity by introducing 4 normalized tables in place of 2.

---

## ADR-018: Strict Separation of B2B Wholesale Procurement and B2C Consumer Carts & Orders

### Status
**Accepted**

### Context
Allowing B2B wholesale products (with MOQs, tax invoice requirements, and business verification) and B2C retail items to be mixed in a single shopping cart creates severe legal, taxation, and operational conflicts under the Bangladesh VAT Act 2012 and Ministry of Commerce guidelines.

### Decision
1. **Cart Segregation:** Carts are strictly typed via `cart_type`: `CONSUMER` vs `BUSINESS`.
2. **Business Ownership:** A `BUSINESS` cart requires an active `buyer_business_id` and verified membership. A user cannot add a wholesale-tier item into a consumer cart, nor a retail item into a wholesale cart.
3. **Order Segregation:** Orders inherit `order_type` (`B2B` or `B2C`). B2B orders enforce mandatory business tax identification, BIN, and commercial challan generation.

### Consequences
- **Positive:** Clean taxation lines, compliance with National Board of Revenue (NBR) invoice standards, and transparent seller fulfillment rules.
- **Negative:** A user wishing to make both a corporate procurement and a personal purchase must checkout twice.

---

## ADR-019: Distributed Job Locking via Native PostgreSQL Advisory Locks

### Status
**Accepted**

### Context
In production on Render, the NestJS API may scale to 2 or more horizontal Node.js instances. Background tasks (reservation expiry, payment reconciliation, settlement processing) scheduled via cron (`@Cron`) would fire simultaneously on all instances, causing duplicate charges, race conditions, and corrupted stock numbers. Redis was ruled out under the zero-local-container mandate.

### Decision
Use **PostgreSQL Native Advisory Locks** (`pg_try_advisory_lock(int8)` / `pg_advisory_unlock(int8)`):
- Before running a scheduled task, the instance attempts to acquire an advisory lock using a unique 64-bit task ID.
- If the lock is held by another instance, the current instance skips execution immediately.
- The lock is tied to the PostgreSQL session and auto-releases if the instance crashes or the connection drops.

### Consequences
- **Positive:** Zero external infrastructure (no Redis, no ZooKeeper), 100% resilient across horizontal API instances, native to Neon PostgreSQL.
- **Negative:** Lock keys must be managed as unique integer constants across application services.

---

## ADR-020: Transactional Outbox Pattern for Resilient Event & Notification Dispatch

### Status
**Accepted**

### Context
Dispatching notifications (SMS, Email, Push) and external webhooks directly inside an HTTP request or database transaction creates two failure modes: (1) network latency to third parties blocks the database transaction, or (2) the database commits but the network call fails, causing lost events.

### Decision
Implement the **Transactional Outbox Pattern**:
- When an order, payment, or verification event occurs, an event record is written to a `system_outbox` table within the **same ACID transaction** as the business entity.
- A background worker, protected by a PostgreSQL advisory lock, polls `system_outbox` and dispatches external calls with exponential backoff and retry tracking.

### Consequences
- **Positive:** Guarantees at-least-once message delivery; decouples external API latency from user-facing transactions.
- **Negative:** Introduces slight asynchronous latency (1–5 seconds) for non-critical notifications.

---

## ADR-021: Distinction Between Bangladesh Statutory Regulations vs. Platform Risk Policies

### Status
**Accepted**

### Context
Marketplace specifications often conflate internal business risk rules with statutory legal mandates. In Bangladesh, misrepresenting business policies as statutory law creates compliance confusion during regulatory audits.

### Decision
Explicitly separate and document:
1. **Statutory Legal Mandates:**
   - *Digital Commerce Operation Guidelines 2021 (Ministry of Commerce):* Mandatory merchant identity disclosures (Trade License, BIN), 5-day intra-district and 10-day inter-district delivery caps, and 7–10 day refund processing for undelivered prepaid orders.
   - *Bangladesh VAT Act 2012:* Statutory requirement to retain commercial invoices and accounting records for **6 years**.
   - *Payment and Settlement Systems Act 2014 (Bangladesh Bank):* Prohibition on unlicensed entities issuing electronic money or operating consumer stored-value deposits.
2. **Platform Business Risk Policies (Configurable):**
   - *Cash on Delivery (COD) ৳10,000 ceiling:* An internal risk policy to limit Return-to-Origin courier losses, NOT a statutory cap.
   - *15-minute reservation TTL:* An internal concurrency rule.
   - *Category commission rates (e.g. 5%):* Commercial contractual terms, fully configurable in database settings.

### Consequences
- **Positive:** Clear audit readiness; enables the executive team to adjust commercial policies without legal uncertainty.
- **Negative:** Requires formal legal and accounting consultation prior to commercial launch.
