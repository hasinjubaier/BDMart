# Environment Variables and Secrets Specification

## 1. Secrets Management Principles

- **Zero Secrets in Source Control:** No real credentials, API tokens, or secrets may ever be committed to Git. A sanitized `.env.example` file is maintained in the repository root.
- **Client vs. Server Separation:** Next.js exposes variables prefixed with `NEXT_PUBLIC_` to the client browser bundle. **Never prefix sensitive server-only API keys or database connection strings with `NEXT_PUBLIC_`.**
- **Runtime Injection:** Production secrets are injected dynamically via Firebase App Hosting secrets manager or Vercel Environment Variables.
- **Zod Validation at Boot:** All environment variables are strictly validated on server startup in `src/env.ts`. If any required secret is missing or malformed, the process immediately exits with a descriptive error.

---

## 2. Environment Variables Catalog

| Variable Name | Exposure | Required In | Description / Sample Value |
|---|:---:|:---:|---|
| `DATABASE_URL` | Server Only | All | Neon pooled PostgreSQL connection string with TLS (`postgres://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/bdmart?sslmode=require`). |
| `DATABASE_URL_UNPOOLED` | Server Only | All | Direct unpooled connection string for executing Drizzle schema migrations. |
| `NEXT_PUBLIC_SITE_URL` | Public / Client | All | Base application URL (e.g., `https://bdmart.com.bd` or `http://localhost:3000`). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public / Client | All | Firebase Web Client API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public / Client | All | Firebase Auth domain (`bdmart-auth.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public / Client | All | Firebase Project ID (`bdmart-prod`). |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Public / Client | All | Firebase Storage public bucket name (`bdmart-prod.appspot.com`). |
| `FIREBASE_ADMIN_CREDENTIALS` | Server Only | Production | JSON string of the service account key for `firebase-admin` server session verification. |
| `ANTHROPIC_API_KEY` | Server Only | All | Secret API key for Claude API invocation. |
| `AI_MODEL` | Server Only | All | Name of Claude model (`claude-3-5-sonnet-20241022`). Never hardcoded in source. |
| `PAYMENT_GATEWAY` | Server Only | All | Active primary gateway adapter (`sslcommerz` or `aamarpay`). |
| `PAYMENT_STORE_ID` | Server Only | All | Merchant store identifier provided by payment gateway. |
| `PAYMENT_STORE_PASSWORD` | Server Only | All | Secret password / API token for validating gateway IPN callbacks. |
| `PAYMENT_SANDBOX` | Server Only | All | Boolean flag (`true` in dev/staging; `false` in production). |
| `COURIER_API_KEY` | Server Only | All | API token for Pathao / Steadfast logistics platform. |
| `COURIER_SECRET` | Server Only | All | Shared HMAC secret for verifying incoming courier status webhooks. |
| `SENTRY_DSN` | Server / Client | Staging / Prod | Error tracking endpoint URL. |

---

## 3. Canonical `.env.example`

```bash
# ==============================================================================
# BD Mart Environment Configuration Template (.env.example)
# Copy to .env.local for local development. Never commit .env.local to Git!
# ==============================================================================

# Database (Neon Serverless PostgreSQL)
DATABASE_URL=postgres://bdmart_user:your_password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/bdmart?sslmode=require
DATABASE_URL_UNPOOLED=postgres://bdmart_user:your_password@ep-sample.ap-southeast-1.aws.neon.tech/bdmart?sslmode=require

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Firebase Client SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA_SampleApiKeyXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bdmart-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bdmart-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bdmart-app.appspot.com

# Firebase Server Admin SDK (Server Only)
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account","project_id":"bdmart-app","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...","client_email":"firebase-adminsdk@bdmart-app.iam.gserviceaccount.com"}

# AI Integration (Anthropic Claude API - Server Only)
ANTHROPIC_API_KEY=sk-ant-api03-sampleKeyXXXXXXXXXXXX
AI_MODEL=claude-3-5-sonnet-20241022

# Payment Gateway (SSLCommerz / aamarPay Sandbox)
PAYMENT_GATEWAY=sslcommerz
PAYMENT_STORE_ID=bdmart_sandbox_01
PAYMENT_STORE_PASSWORD=bdmart_secret_pass_123
PAYMENT_SANDBOX=true

# Courier Logistics Integration (Pathao / Steadfast)
COURIER_API_KEY=bearer_pathao_test_token_XXXX
COURIER_SECRET=hmac_secret_courier_webhook_signature

# Telemetry & Monitoring
SENTRY_DSN=https://samplekey@o000000.ingest.sentry.io/0000000
```
