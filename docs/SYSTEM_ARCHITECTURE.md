# System Architecture & Component Specification (v1.1 Corrected)

## 1. High-Level System Architecture

The BDMart platform is designed as a **Modular Monolith** backend supporting a unified multi-client frontend tier. All clients interact with a single, highly structured NestJS REST API. Cloud services are fully managed, eliminating local infrastructure dependencies on the development machine.

```mermaid
flowchart TD
    subgraph Clients["Cross-Platform Client Tier"]
        MobileApp["Mobile Application\n(React Native 0.79+ / Expo SDK 54)\nAndroid & iOS\n[B2B Wholesale + B2C Consumer Modes]"]
        WebStore["Storefront Web\n(Next.js 16 Active LTS / App Router)\n[B2C & B2B Discovery & SEO]"]
        WebSeller["Seller Portal\n(Next.js 16 Active LTS / Route Group)\n[Catalog, Inventory, Sub-Orders, Quotations]"]
        WebAdmin["Admin Portal\n(Next.js 16 Active LTS / Route Group)\n[Moderation, Disputes, Finance, Audit]"]
    end

    subgraph CDN_Gateway["Edge & Ingestion Tier"]
        CloudflareEdge["Cloudflare Edge Network & WAF\n(DDoS, SSL Termination, Media Optimization)"]
        VercelEdge["Vercel Edge Network\n(SSR / ISR / Web Asset Caching)"]
    end

    subgraph BackendAPI["Application Compute Tier (Render Node.js Service)"]
        NestCore["NestJS 11.x Modular Monolith API (/v1)\nNode.js 24 LTS Runtime"]
        subgraph Modules["Internal Business Domain Modules"]
            AuthMod["Auth & Identity (OTP + JWT)"]
            BizMod["Business & Verification"]
            CatMod["Catalog & Taxonomy"]
            ListMod["Listings & Tier Pricing"]
            InvMod["Inventory & Warehousing"]
            OrderMod["Orders & Multi-Seller Split"]
            RFQMod["RFQ & Quotations (Multi-Supplier)"]
            PayMod["Payments & Gateway Adapters"]
            ShipMod["Logistics & Courier Adapters"]
            AuditMod["Audit & Security Engine"]
            OutboxMod["Transactional Outbox Dispatcher"]
        end
        NestCore --- Modules
    end

    subgraph StorageData["Managed Persistence Tier (Zero Docker)"]
        NeonPooled["Neon PostgreSQL (Pooled)\nHost: [endpoint]-pooler.[region].aws.neon.tech\n[@prisma/adapter-neon / Application Traffic]"]
        NeonDirect["Neon PostgreSQL (Unpooled / Direct)\nHost: [endpoint].[region].aws.neon.tech\n[prisma.config.ts / CLI DDL Migrations]"]
        CloudflareR2["Cloudflare R2 Object Storage\n[Product Media & Private Documents]"]
    end

    subgraph ExternalServices["External Ecosystem Integrations"]
        PayGate["Payment Gateways\n(SSLCOMMERZ, bKash, Nagad)"]
        Couriers["Logistics Couriers\n(Pathao, Steadfast, RedX)"]
        SMS_GW["Bangladesh SMS Gateway\n(Masked OTPs & Alerts)"]
        Email_GW["Transactional Email\n(Resend API)"]
        Push_GW["Push Notification Relay\n(Expo EAS / FCM / APNs)"]
    end

    %% Client Routing
    MobileApp -->|HTTPS / REST API| CloudflareEdge
    WebStore -->|HTTPS / Web Rendering| VercelEdge
    WebSeller -->|HTTPS / Web Rendering| VercelEdge
    WebAdmin -->|HTTPS / Web Rendering| VercelEdge
    VercelEdge -->|Server-Side Fetch / API| CloudflareEdge
    CloudflareEdge -->|Reverse Proxy / WAF| NestCore

    %% Backend Persistence
    Modules -->|Prisma 6 Client / Pooled Connection| NeonPooled
    Modules -->|S3 Presigned SDK| CloudflareR2

    %% Backend External Integrations
    PayMod -->|HTTPS REST / Webhooks| PayGate
    ShipMod -->|HTTPS REST / Webhooks| Couriers
    OutboxMod -->|HTTPS REST| SMS_GW
    OutboxMod -->|HTTPS REST| Email_GW
    OutboxMod -->|HTTPS REST| Push_GW
```

---

## 2. Multi-Supplier B2B Procurement Workflow (RFQ & Competitive Quotations)

In wholesale commerce, a business buyer frequently creates a single RFQ and solicits competitive bids from multiple authorized distributors or manufacturers.

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Business Buyer
    participant App as Buyer Portal / Mobile App
    participant API as NestJS RFQ Module
    participant DB as Neon PostgreSQL
    actor SupplierA as Supplier A (Wholesaler)
    actor SupplierB as Supplier B (Manufacturer)

    Buyer->>App: Creates RFQ (Title, Category, Items, Qty, Target Price, Delivery Date)
    App->>API: POST /v1/b2b/rfq-requests
    API->>DB: Insert rfq_requests & rfq_request_items (Status: OPEN)
    API->>DB: Link eligible category sellers in rfq_target_sellers
    API->>DB: Insert event in system_outbox (rfq.broadcasted)
    
    par Multi-Supplier Notification
        SupplierA->>API: GET /v1/seller/rfq-requests/:id (Views RFQ details)
        SupplierB->>API: GET /v1/seller/rfq-requests/:id (Views RFQ details)
    end
    
    SupplierA->>API: POST /v1/seller/rfq-requests/:id/quotations (Offers ৳520/unit, 3-day lead)
    API->>DB: Insert seller_quotations (QT-01, Status: SUBMITTED)
    
    SupplierB->>API: POST /v1/seller/rfq-requests/:id/quotations (Offers ৳505/unit, 7-day lead)
    API->>DB: Insert seller_quotations (QT-02, Status: SUBMITTED)
    
    Buyer->>API: GET /v1/b2b/rfq-requests/:id/quotations (Compares bids side-by-side)
    Buyer->>API: POST /v1/b2b/quotations/QT-02/accept (Selects Supplier B)
    
    rect rgb(240, 255, 240)
        Note over API,DB: ATOMIC QUOTATION ACCEPTANCE TRANSACTION
        API->>DB: Update QT-02 status to ACCEPTED
        API->>DB: Update competing quotations (QT-01) status to REJECTED
        API->>DB: Update parent rfq_requests status to AWARDED
        API->>DB: Generate Draft B2B Order with immutable price snapshot from QT-02
    end
    
    API-->>Buyer: Draft Order Created (ORD-B2B-XXXX); Supplier B Notified
```

---

## 3. Strict Cart & Order Segregation (B2B vs. B2C)

To guarantee compliance with statutory taxation (Bangladesh VAT Act 2012) and Ministry of Commerce commercial invoice guidelines, wholesale and retail purchases cannot be mixed in the same transaction:

```mermaid
flowchart TD
    CartStart[User Adds Item to Cart] --> CheckListingType{Is Item a B2B Wholesale Tier\nor B2C Retail Offer?}
    
    CheckListingType -->|B2B Wholesale Offer| B2B_Check{Does Active Cart == CONSUMER?}
    B2B_Check -->|Yes| BlockB2B[Throw 422: Cannot mix wholesale items in consumer cart.\nPlease switch to Business Mode.]
    B2B_Check -->|No| CheckBizAuth{Is User a Verified\nBusiness Member?}
    CheckBizAuth -->|No| RequireVerification[Prompt Business Verification\nSubmit Trade License / BIN]
    CheckBizAuth -->|Yes| AddToBizCart[Add to BUSINESS Cart\nCheck MOQ & Pack Multiples]
    
    CheckListingType -->|B2C Retail Offer| B2C_Check{Does Active Cart == BUSINESS?}
    B2C_Check -->|Yes| BlockB2C[Throw 422: Cannot mix retail items in business cart.\nPlease switch to Consumer Mode.]
    B2C_Check -->|No| AddToConsumerCart[Add to CONSUMER Cart\nSingle-unit pricing applied]
```

---

## 4. Distributed Background Processing with Zero External Infrastructure

Render web services may scale horizontally to 2 or more Node.js instances. Without Redis, instances prevent duplicate scheduled tasks by leveraging **PostgreSQL Native Advisory Locks**:

```mermaid
sequenceDiagram
    autonumber
    participant Instance1 as Render API Instance 1
    participant Instance2 as Render API Instance 2
    participant DB as Neon PostgreSQL

    Note over Instance1,Instance2: Cron Trigger Fires simultaneously at */1 * * * * (Reservation Expiry)
    Instance1->>DB: SELECT pg_try_advisory_lock(987654321)
    Instance2->>DB: SELECT pg_try_advisory_lock(987654321)
    
    DB-->>Instance1: TRUE (Lock Granted)
    DB-->>Instance2: FALSE (Lock Denied)
    
    Instance2->>Instance2: Skips job execution immediately
    
    Instance1->>DB: Finds expired reservations (status = 'PENDING' AND expires_at < NOW())
    Instance1->>DB: Decrements quantity_reserved, marks status = 'EXPIRED'
    Instance1->>DB: SELECT pg_advisory_unlock(987654321)
    DB-->>Instance1: Lock Released
```

### Transactional Outbox Pattern
1. State-changing transactions write an event row into `system_outbox` in the same database transaction.
2. A scheduled outbox worker, guarded by an advisory lock, polls `system_outbox` for `PENDING` records, dispatches SMS/Email/Push notifications, and updates the row to `COMPLETED` (or records failure retry counters).
3. If an external notification gateway fails or experiences latency, the user's primary transaction remains fast and unblocked.
