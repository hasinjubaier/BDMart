# System Context Specification

## 1. C4 System Context Diagram (Level 1)

The System Context diagram illustrates BD Mart's core boundaries and interactions with human actors and external systems:

```mermaid
graph TD
    subgraph Users["Human Actors"]
        B2C["Retail Buyer (buyer)"]
        B2B["Business Buyer (business_buyer)"]
        Seller["Merchant (seller)"]
        Admin["Platform Admin (admin)"]
    end

    subgraph Platform["BD Mart Platform"]
        CoreApp["BD Mart Web Application\n(Next.js App Router, SSR, RSC, Server Actions)"]
        Database[("Neon Serverless PostgreSQL\n(Managed Relational DB, Branching)")]
    end

    subgraph ExternalServices["External Cloud & 3PL Services"]
        FirebaseAuth["Firebase Authentication\n(Phone OTP, Google Auth)"]
        FirebaseStorage["Firebase Storage\n(Media, Private KYC Buckets)"]
        PaymentGateway["Payment Gateways\n(SSLCommerz / aamarPay Sandbox)"]
        CourierServices["3PL Courier APIs\n(Pathao / Steadfast)"]
        ClaudeAI["Anthropic Claude API\n(Bangla Content & RFQ Assistance)"]
        Sentry["Sentry Monitoring\n(Error Tracking & Telemetry)"]
    end

    B2C -->|HTTPS / Browsing & Orders| CoreApp
    B2B -->|HTTPS / Bulk Sourcing & RFQ| CoreApp
    Seller -->|HTTPS / Inventory & Fulfillment| CoreApp
    Admin -->|HTTPS / Governance & Escrow| CoreApp

    CoreApp -->|Drizzle ORM / SQL| Database
    CoreApp -->|Session Token Verification| FirebaseAuth
    CoreApp -->|Media Upload & Signed URLs| FirebaseStorage
    CoreApp -->|Session Init & Server IPN| PaymentGateway
    CoreApp -->|Consignment Booking & Tracking| CourierServices
    CoreApp -->|Server-side Prompts| ClaudeAI
    CoreApp -->|Exception Logging| Sentry
```

---

## 2. C4 Container Diagram (Level 2)

```mermaid
graph TD
    subgraph ClientBrowser["Client Web Browser (Desktop / Mobile PWA)"]
        RSCClient["React Client Components (Tailwind CSS, shadcn/ui)"]
        TanStack["TanStack Query (Client-side Data Caching)"]
    end

    subgraph AppServer["Next.js Server Runtime (Node.js LTS)"]
        RSC["React Server Components (Default SSR Rendering)"]
        ServerActions["Server Actions (State Mutations & Forms)"]
        RouteHandlers["API Route Handlers (/api/webhooks/*)"]
        ServiceLayer["Service Layer (server/services/*)\n- OrderService\n- EscrowService\n- CatalogService\n- RFQService\n- CourierService"]
        AuthModule["Auth Module (lib/auth/*)\n- requireRole()\n- firebase-admin"]
        ZodValidators["Zod Schema Validation Engine"]
    end

    subgraph Persistence["Storage & Database Tier"]
        Drizzle["Drizzle ORM Engine"]
        NeonDB[("Neon PostgreSQL Serverless Branch")]
        FileBuckets["Firebase Storage Buckets"]
    end

    ClientBrowser -->|HTTP/2 / JSON-LD / HTML| RSC
    ClientBrowser -->|Action Invocations| ServerActions
    ExternalGateways["SSLCommerz / Pathao Webhooks"] -->|HTTP POST| RouteHandlers

    ServerActions --> AuthModule
    ServerActions --> ZodValidators
    ServerActions --> ServiceLayer
    RouteHandlers --> ServiceLayer

    ServiceLayer --> Drizzle
    Drizzle --> NeonDB
    ServiceLayer --> FileBuckets
```

---

## 3. External Integrations Matrix

| System | Role | Protocol | Security Mechanism |
|---|---|---|---|
| **Firebase Authentication** | User identity & phone OTP validation | REST / Admin SDK | Verification via `firebase-admin` server SDK; session stored in `HttpOnly` cookie. |
| **Firebase Storage** | Product imagery & KYC documents | REST / Admin SDK | Public read for product media; private ACL with admin-generated signed URLs for KYC documents. |
| **Neon PostgreSQL** | Primary relational database | PostgreSQL TCP (5432) | TLS/SSL encrypted connection pooling with role-based branching. |
| **SSLCommerz / aamarPay** | Payment processing gateway | REST / HTTPS Webhooks | Direct server-to-server transaction validation API; webhook signature verification; idempotency keys. |
| **Pathao / Steadfast** | 3PL courier logistics & tracking | REST / HTTPS Webhooks | Bearer API token; webhook secret hash validation. |
| **Anthropic Claude API** | Content generation & smart search | HTTPS (Server-Side) | Server-only `ANTHROPIC_API_KEY`; strict Zod schema validation on all returned AI responses. |
| **Sentry** | Production error monitoring | HTTPS | DSN endpoint; automated exception tracking with PII stripping. |
