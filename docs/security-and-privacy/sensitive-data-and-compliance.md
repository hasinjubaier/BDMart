# Sensitive Data and Compliance Specification

## 1. PII and Sensitive Commercial Assets

In an e-commerce platform processing government registrations and financial disbursements, data classification determines storage and encryption controls:

| Data Asset | Classification | Storage Location | Protection Control |
|---|---|---|---|
| **User Passwords** | N/A (Passwordless) | Firebase Auth | Handled entirely by Firebase Identity Platform (SMS OTP / Google OAuth). BD Mart never stores raw passwords. |
| **Customer Phone Numbers & Addresses** | Confidential / PII | PostgreSQL (`users`, `addresses`) | TLS 1.3 in transit, encrypted at rest via Neon storage encryption. Restricted to delivery agents and platform order dispatchers. |
| **Seller National ID (NID) Reference** | Highly Restricted | PostgreSQL (`sellers.nid_ref`) | Masked in UI (e.g., `XXXXXXXX1294`). Stored hashed or encrypted at application layer. |
| **Trade License & Tax Documents (PDF/Images)**| Restricted Commercial | Firebase Storage (Private Bucket) | Stored in private bucket with zero public access. Accessible only via short-lived (15-minute) presigned URLs generated server-side for authenticated Admins. |
| **Payment Credentials (Card / bKash PIN)** | Critical (Out-of-Scope) | Payment Gateway (SSLCommerz) | Never touches BD Mart servers. Processed entirely within PCI-DSS Level 1 compliant gateway frame. |

---

## 2. OWASP Top 10 Controls Implementation

| Vulnerability | Threat Scenario | BD Mart Architectural Defense |
|---|---|---|
| **Broken Access Control** | User changes URL `orderId` to view foreign customer details | Server Action verifies `order.buyer_id === session.userId` or `order.seller_id === session.sellerId`. Negative tests verify 403 Forbidden. |
| **Cryptographic Failures** | Eavesdropping on credentials or payment tokens | Strict HTTPS everywhere, HSTS header enforced (`max-age=63072000; includeSubDomains; preload`). Session cookies use `Secure` and `HttpOnly`. |
| **Injection (SQL & Prompt)** | SQL injection or LLM prompt manipulation | Drizzle ORM parameterized queries (zero string concatenation). Claude API input wrapped in distinct XML data blocks; output parsed via strict Zod schemas. |
| **Insecure Design** | Circumventing MOQ by directly calling order API | Server-side service validation guarantees `qty >= product.moq` regardless of client-side validation state. |
| **Security Misconfiguration**| Leaving default admin credentials or verbose stack traces | Next.js production builds disable sourcemaps for public bundles; error boundaries hide internal details and report to Sentry. |
| **Vulnerable Components** | Outdated or compromised npm packages | `pnpm audit` runs on every CI pull request; Dependabot automated vulnerability monitoring. |
| **Identification & Auth Failures** | Session hijacking via stolen cookies | `HttpOnly`, `SameSite=Lax`, `Secure` session cookies; automatic session expiration. |
| **Software & Data Integrity Failures** | Tampered webhook payloads | HMAC SHA-256 signature validation on courier and payment webhooks; double-verification against gateway query API. |
| **Security Logging & Monitoring Failures**| Unnoticed privilege escalation or fraudulent activity | All administrative role assignments, KYC approvals, and escrow releases recorded in tamper-evident `audit_logs`. |
| **Server-Side Request Forgery (SSRF)**| Uploading external file URLs to probe internal network | Media uploads must be uploaded directly to Firebase Storage via signed client upload URLs, rejecting arbitrary remote image URLs. |

---

## 3. HTTP Security Headers
Every response includes:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://firebasestorage.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://identitytoolkit.googleapis.com https://securepay.sslcommerz.com;`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
