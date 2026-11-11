# Cloud Deployment & Infrastructure Strategy (v1.1 Corrected)

## 1. Managed Cloud Infrastructure Topology

To satisfy the strict constraint of **zero local Docker containers** while delivering enterprise-grade scalability, reliability, and security, BDMart is deployed exclusively across leading managed cloud platforms:

```mermaid
flowchart TD
    subgraph ClientEndpoints["Client Applications"]
        MobileUsers["Android & iOS Users\n(Expo SDK 54 / EAS Cloud Builds)"]
        WebUsers["Web Browsers\n(Next.js 16 Active LTS / App Router)"]
    end

    subgraph EdgeRouting["Global Edge & CDN Tier"]
        CloudflareCDN["Cloudflare Edge Network & DNS\n- SSL Termination & DDoS Protection\n- Image Optimization & Caching"]
        VercelEdge["Vercel Edge Network\n- Next.js 16 Active LTS Edge Deployment\n- Automatic Branch Previews"]
    end

    subgraph BackendHosting["Application Compute Tier (Render)"]
        RenderService["Render Managed Node.js Service\n- NestJS 11.x Modular Monolith API (/v1)\n- Node.js 24 LTS Runtime\n- Health Check: /v1/health\n- Rolling Zero-Downtime Deploys"]
    end

    subgraph PersistenceCloud["Data & Storage Tier"]
        NeonDB["Neon Serverless PostgreSQL\n- Pooled Connection (Host with -pooler)\n- Unpooled Direct Connection (prisma.config.ts)\n- Point-In-Time Recovery (PITR)"]
        R2Storage["Cloudflare R2 Object Storage\n- Public Bucket: Images & Media\n- Private Bucket: Trade Licenses & Invoices\n- Zero Data Egress Fees"]
    end

    subgraph MobileCI["Mobile Build & Release (Expo EAS)"]
        EASBuild["Expo Application Services (EAS)\n- Cloud Android AAB Build (API Level 36+)\n- Cloud iOS IPA Build\n- Automated Store Submission"]
    end

    MobileUsers --> CloudflareCDN
    WebUsers --> VercelEdge
    VercelEdge --> CloudflareCDN
    CloudflareCDN --> RenderService

    RenderService -->|DATABASE_URL via Pooler| NeonDB
    RenderService -->|S3 SDK / Presigned URLs| R2Storage

    EASBuild -.->|Produces Binaries| MobileUsers
```

---

## 2. Platform Service Selection & Pinned Versions

| Infrastructure Component | Selected Cloud Provider | Runtime / Framework Version | Why Selected |
|---|---|---|---|
| **Web Frontend** | **Vercel** | Next.js 16 Active LTS (React 19.3) | Native Next.js 16 edge optimization, React 19 RSC support, automated preview branches, zero server management. |
| **Backend API** | **Render** | Node.js 24 LTS (NestJS 11.x) | Native Node.js LTS runtime with zero Docker requirement, continuous Git deployment, automated SSL, health checks. |
| **Primary Database** | **Neon** | PostgreSQL 16/17 (Serverless) | Separation of compute and storage, native pgBouncer connection pooling, instant isolated branching for testing. |
| **ORM & Migrations** | **Prisma ORM** | Prisma 6.x (`@prisma/adapter-neon`) | Modern `prisma.config.ts` multi-URL support, type-safe data access, reliable migrations. |
| **Media & File Storage** | **Cloudflare R2** | S3-Compatible Object Storage | **Zero egress fees**, S3 API compatibility, direct presigned client uploads, global CDN edge caching. |
| **Mobile Compilation** | **Expo EAS** | Expo SDK 54 / React Native 0.79+ | Eliminates local Android Studio or macOS Xcode installations; builds production `.aab` and `.ipa` in the cloud. |
| **Domain & DNS** | **Cloudflare** | Managed DNS & WAF | Universal SSL, edge DDoS mitigation, web application firewall (WAF), rate limiting. |

---

## 3. Environment Separation & Configuration Matrix

BDMart maintains three strictly isolated environments:
1. **Development (`dev`):** Local Node processes connected to a personal Neon database branch and sandbox third-party credentials.
2. **Staging (`stage`):** Render and Vercel staging environments connected to a shared Neon staging branch; used for pre-release end-to-end testing and QA.
3. **Production (`prod`):** High-availability Render and Vercel production deployments connected to the primary Neon production compute cluster with live merchant accounts.

### Environment Variable Matrix

```ini
# ==============================================================================
# DATABASE PERSISTENCE (SERVER ONLY - NEVER EXPOSE TO CLIENTS)
# ==============================================================================
# Neon pooled connection string via pgBouncer (used by NestJS runtime via @prisma/adapter-neon)
# Notice: Hostname contains '-pooler'; port is not hardcoded.
DATABASE_URL="postgresql://user:password@ep-cool-lake-123-pooler.ap-southeast-1.aws.neon.tech/bdmart?sslmode=require"

# Neon direct / unpooled connection string (declared in prisma.config.ts for Prisma CLI migrations)
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-cool-lake-123.ap-southeast-1.aws.neon.tech/bdmart?sslmode=require"

# ==============================================================================
# APPLICATION SECURITY & TOKENS (SERVER ONLY)
# ==============================================================================
JWT_ACCESS_SECRET="cryptographically-secure-random-256-bit-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="cryptographically-secure-random-512-bit-key"
JWT_REFRESH_EXPIRES_IN="7d"

# ==============================================================================
# CLOUDFLARE R2 OBJECT STORAGE (SERVER ONLY)
# ==============================================================================
R2_ACCOUNT_ID="cloudflare-account-id"
R2_ACCESS_KEY_ID="r2-access-key-id"
R2_SECRET_ACCESS_KEY="r2-secret-access-key"
R2_PUBLIC_BUCKET_NAME="bdmart-public-media"
R2_PRIVATE_BUCKET_NAME="bdmart-private-documents"
R2_PUBLIC_CUSTOM_DOMAIN="https://media.bdmart.com"

# ==============================================================================
# PAYMENT GATEWAYS (SERVER ONLY)
# ==============================================================================
SSLCOMMERZ_STORE_ID="bdmart001live"
SSLCOMMERZ_STORE_PASS="secure_store_password"
SSLCOMMERZ_IS_SANDBOX="false"

BKASH_APP_KEY="bkash-live-app-key"
BKASH_APP_SECRET="bkash-live-app-secret"
BKASH_USERNAME="bkash-live-username"
BKASH_PASSWORD="bkash-live-password"
BKASH_IS_SANDBOX="false"

# ==============================================================================
# THIRD-PARTY MESSAGING (SERVER ONLY)
# ==============================================================================
SMS_GATEWAY_API_KEY="bd-sms-provider-key"
SMS_GATEWAY_SENDER_ID="BDMART"
RESEND_API_KEY="re_live_resend_api_key"

# ==============================================================================
# CLIENT-PUBLIC CONFIGURATION (EXPOSED IN CLIENT BUNDLES)
# ==============================================================================
NEXT_PUBLIC_API_BASE_URL="https://api.bdmart.com/v1"
EXPO_PUBLIC_API_BASE_URL="https://api.bdmart.com/v1"
NEXT_PUBLIC_MEDIA_BASE_URL="https://media.bdmart.com"
EXPO_PUBLIC_MEDIA_BASE_URL="https://media.bdmart.com"
```

> [!CAUTION]
> **Strict Secret Isolation:** Any variable prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_` is bundled into browser and mobile JavaScript binaries. **Never** prefix database credentials, JWT signing secrets, or payment merchant passwords with these prefixes.

---

## 4. Zero-Downtime Deployment & Database Migration Procedure

Database migrations in a 24/7 marketplace must never take down the live store. We employ the **Expand/Contract Migration Pattern**:

```mermaid
sequenceDiagram
    autonumber
    participant Dev as CI/CD Pipeline
    participant DB as Neon PostgreSQL Direct Compute
    participant OldAPI as Active Render Instances (v1.0)
    participant NewAPI as New Render Instances (v1.1)

    Dev->>DB: Step 1: Run Non-Destructive Migrations (Expand) via DATABASE_URL_UNPOOLED
    Note over DB: Add new columns as NULLABLE or with DEFAULT values.<br/>Never drop or rename columns currently read by v1.0!
    
    Dev->>NewAPI: Step 2: Spin up new version (v1.1) on Render
    NewAPI->>NewAPI: Execute internal health checks (/v1/health)
    
    Dev->>OldAPI: Step 3: Shift traffic to v1.1 & drain connections
    Dev->>OldAPI: Terminate v1.0 instances
    
    Note over Dev,DB: Step 4: Contract (Optional post-deploy migration)<br/>Drop obsolete columns in subsequent release after verification.
```

### Prisma Migration Execution in CI/CD
```powershell
# Migrations execute against the unpooled direct connection defined in prisma.config.ts
pnpm --filter @bdmart/database prisma migrate deploy
```

---

## 5. Backup, Restore & Disaster Recovery Playbook

1. **Continuous Automated Backups:** Neon automatically captures Write-Ahead Logs (WAL), enabling Point-In-Time Recovery (PITR) to any second within the retention window.
2. **Instant Disaster Recovery via Branching:**
   - If a catastrophic data corruption occurs in production, an operator can create an instant recovery branch in Neon from 5 minutes prior to the incident:
     ```bash
     neon branches create --from-timestamp "2026-11-12T02:30:00Z" --name recovery-branch
     ```
   - Update the Render `DATABASE_URL` environment variable to point to the recovery branch; service restores in under **5 minutes**.
3. **Cloudflare R2 Object Versioning:** Versioning is enabled on the private documents bucket to protect against accidental file deletions or overwrites.
