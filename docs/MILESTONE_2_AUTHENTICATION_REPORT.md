# BDMart — Milestone 2 Completion Report: Authentication, User Management & Identity Architecture

**Date:** November 12, 2026  
**Status:** Completed & Fully Verified  
**Milestone:** Milestone 2 (IAM & Authentication Foundation)  
**Target Neon Branch:** `development` (`br-flat-haze-bekg4mjm`)  
**Production Neon Branch:** `production` (`br-still-union-bekqgs0r` — 100% untouched, 0 tables)

---

## 1. Executive Summary

Milestone 2 establishes the core authentication, user identity, session lifecycle, and Role-Based Access Control (RBAC) architecture for the BDMart marketplace platform.

### Key Milestones Delivered:
1. **Bangladesh-First Phone OTP Authentication:** Primary login and registration mechanism tailored for Bangladesh mobile telecom networks (+8801[3-9]XXXXXXXX E.164 normalization, SHA-256 hashed challenge storage, 5-minute expiration, 60-second resend cooldown, brute-force lockout after 3 failed attempts, and single-use challenge consumption).
2. **Mock SMS Gateway Provider:** Development-mode SMS abstraction simulating carrier dispatch with redacted recipient logs, preventing external API costs while remaining drop-in compatible with Bangladesh SMS aggregators (SSL Wireless, Banglalink, Grameenphone, Robi).
3. **Dual Language Identity & Profiles:** Support for dual English (`fullName`) and Bengali (`fullNameBn`) user names, preferred language selection (`bn` / `en`), and account lifecycle management (registration, profile updates, account deactivation, deletion requests).
4. **Resilient Session & Token Security:** 15-minute access JWTs coupled with 7-day cryptographically secure refresh tokens. Refresh tokens are rotated on each use with session family tracking and cryptographic replay attack detection that revokes all active family sessions upon replay.
5. **Role-Based Access Control (RBAC):** Seeded roles (`CUSTOMER`, `PLATFORM_ADMIN`, `SUPPORT_OPERATOR`) enforced across NestJS guards (`JwtAuthGuard`, `RolesGuard`) and decorators (`@Public()`, `@Roles()`, `@CurrentUser()`).
6. **Isolated Neon Database Migration:** Scoped to exactly the 9 Milestone 2 IAM tables on the dedicated Neon `development` branch without running any migrations or creating any tables on the `production` branch.
7. **End-to-End Client Implementations:** Complete web UI flows in Next.js 16 (`apps/web`) and mobile UI flows in Expo SDK 58 (`apps/mobile`) with hardware-backed secure storage via `expo-secure-store`.
8. **14/14 Security Tests Passing:** Automated security and penetration verification test suite passed against the live Neon development branch.

---

## 2. Neon Database Branching & Scoped Schema Migration

### 2.1 Branch Isolation Audit

| Environment | Branch ID | Endpoint Host | Tables Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `br-still-union-bekqgs0r` | `ep-hidden-heart-bek8oxf0` | **0 tables** | **Pristine / Untouched** |
| **Development** | `br-flat-haze-bekg4mjm` | `ep-billowing-resonance-beypcxyy` | **10 tables** (9 IAM + `_prisma_migrations`) | **Migrated & Active** |

### 2.2 Dual Connection Configuration

- **Runtime Queries:** Configured via `POOLED_DATABASE_URL` targeting PgBouncer (`ep-billowing-resonance-beypcxyy-pooler.c-9.us-east-2.aws.neon.tech`), utilizing Neon Serverless Driver adapter for high-concurrency connection pooling.
- **Prisma Migrations:** Configured via `DATABASE_URL_UNPOOLED` / `DIRECT_DATABASE_URL` targeting the direct compute endpoint (`ep-billowing-resonance-beypcxyy.c-9.us-east-2.aws.neon.tech`), satisfying PostgreSQL session-level advisory lock requirements during migrations.

### 2.3 Scoped Schema Tables

The full 38-table marketplace schema has been archived at [`database/prisma/schema.blueprint.prisma`](file:///d:/Project/BDMart/database/prisma/schema.blueprint.prisma) to serve subsequent milestones. The active [`database/prisma/schema.prisma`](file:///d:/Project/BDMart/database/prisma/schema.prisma) contains only the 9 IAM tables:

1. `users`: Core identity table (UUID, phone, email, passwordHash, status, verification flags).
2. `user_profiles`: Persona metadata (`fullName`, `fullNameBn`, `avatarUrl`, `preferredLanguage`, `gender`).
3. `otp_challenges`: Short-lived verification challenges (`otpHash`, `purpose`, `attempts`, `maxAttempts`, `expiresAt`, `resendAvailableAt`, `consumedAt`).
4. `user_sessions`: Refresh token rotation tracking (`familyId`, `refreshTokenHash`, `rotationCounter`, `isRevoked`, `expiresAt`, `userAgent`, `ipAddress`).
5. `roles`: Role taxonomy (`CUSTOMER`, `PLATFORM_ADMIN`, `SUPPORT_OPERATOR`).
6. `permissions`: Granular capability flags.
7. `role_permissions`: Many-to-many role-to-permission mapping.
8. `user_roles`: User role assignments.
9. `account_security_events`: Immutable security audit log (`LOGIN_PASSWORD`, `OTP_REQUEST`, `OTP_VERIFIED`, `OTP_FAILED`, `REFRESH_TOKEN_REPLAY`, `PROFILE_UPDATED`, `ACCOUNT_DEACTIVATED`, etc.).

---

## 3. Core Authentication Workflow

```
   [ Client: Web / Mobile ]
             │
             │ 1. POST /api/v1/auth/otp/request { phone: "01712345678" }
             ▼
      [ Api Gateway ]
             │
             ├── Normalizes to E.164 (+8801712345678)
             ├── Validates Operator Code (01[3-9])
             ├── Checks Resend Cooldown (60s)
             ├── Generates 6-Digit Cryptographic Code
             ├── Stores SHA-256 Hashed Challenge
             └── Dispatches via MockSmsProvider (Simulated Carrier Delivery)
             │
             │ 2. POST /api/v1/auth/otp/verify { phone: "01712345678", otp: "123456" }
             ▼
      [ Api Gateway ]
             │
             ├── Checks Expiration (5 min) & Attempts (< 3)
             ├── Performs Timing-Safe SHA-256 Hash Comparison
             ├── Marks Challenge Consumed (One-Time-Use)
             │
             ├── IF New User:
             │     └── Returns { isNewUser: true, phone: "+8801712345678" }
             │         └── Client navigates to /register
             │
             └── IF Existing User:
                   ├── Generates 15-min Access JWT & 7-day Rotating Refresh Token
                   ├── Creates Session Record in user_sessions
                   └── Returns Tokens + UserProfile
```

### 3.1 Phone Normalization & Validation
- **Regex:** `^(?:\+?880|0)?1[3-9]\d{8}$`
- Accepts inputs: `01712345678`, `+8801712345678`, `8801712345678`.
- Normalizes to canonical E.164 format: `+8801712345678`.
- Rejects non-operator prefixes (e.g., `010`, `011`, `012`).

### 3.2 Security Controls
- **Zero Plaintext OTPs:** The database only stores `SHA-256(otp + salt)`.
- **Timing-Safe Comparison:** `crypto.timingSafeEqual` prevents timing side-channel attacks during verification.
- **Rate Limiting & Cooldown:**
  - 60-second cooldown between resend requests for the same phone.
  - Maximum 10 OTP requests per hour per phone.
  - Maximum 3 verification attempts per challenge before permanent invalidation.
- **One-Time Consumption:** Challenge is flagged with `consumedAt` immediately upon success; any subsequent attempt with the same code returns `400 Bad Request`.

---

## 4. Session & Refresh Token Lifecycle

```
[ Rotation Event ]
Old Refresh Token (Hash A) ──────> API Validates Hash A
                                          │
                                          ├── Marks Session A: isRevoked = true
                                          ├── Generates New Token (Hash B)
                                          └── Creates Session B (Same familyId, rotationCounter + 1)

[ Replay Attack Detected ]
Attacker submits Old Refresh Token (Hash A)
       │
       ▼
API finds Session A (isRevoked == true)
       │
       ├── Emits Security Alert: REFRESH_TOKEN_REPLAY
       ├── Immediately revokes ALL sessions with familyId == Session A.familyId
       └── Returns 401 Unauthorized
```

- **Web Storage:** Server sets `refreshToken` in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Web client stores access token in memory or authenticated state context.
- **Mobile Storage:** Mobile client securely stores both `accessToken` and `refreshToken` in native hardware-backed encrypted storage via `expo-secure-store`.

---

## 5. API Endpoints Specification

All endpoints are hosted under `/api/v1/` and documented via OpenAPI Swagger at [`/api/docs`](http://localhost:4000/api/docs).

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/auth/otp/request` | Public | Request a 6-digit OTP code for Bangladesh mobile number. |
| `POST` | `/v1/auth/otp/verify` | Public | Verify OTP code; logs in existing user or prompts registration. |
| `POST` | `/v1/auth/register` | Public | Register new user with verified phone, name (EN/BN), and preferences. |
| `POST` | `/v1/auth/login/password` | Public | Password authentication for business users and administrators. |
| `POST` | `/v1/auth/refresh` | Public | Rotates refresh token and issues new access/refresh pair. |
| `POST` | `/v1/auth/logout` | Authenticated | Revokes current session and clears cookies. |
| `POST` | `/v1/auth/logout-all` | Authenticated | Revokes all active sessions across all devices for current user. |
| `GET` | `/v1/auth/me` | Authenticated | Returns current authenticated user and assigned roles. |
| `GET` | `/v1/users/me` | Authenticated | Detailed user profile, phone, email, and preferences. |
| `PATCH` | `/v1/users/me` | Authenticated | Update user profile (names, language, avatar, gender). |
| `POST` | `/v1/users/me/deactivate` | Authenticated | User-initiated account deactivation. |
| `POST` | `/v1/users/me/deletion-request`| Authenticated | User-initiated account deletion request with audit log. |
| `GET` | `/v1/users` | Admin / Support | Paginated user management list with role inspection. |

---

## 6. Security Test Results

A dedicated integration test suite [`apps/api/test/security.test.ts`](file:///d:/Project/BDMart/apps/api/test/security.test.ts) was executed directly against the live Neon development branch (`br-flat-haze-bekg4mjm`).

| # | Test Scenario | Verified Security Property | Result |
| :---: | :--- | :--- | :---: |
| 1 | Phone Normalization | Converts `01712345678` & `+8801812345678` to standard E.164; rejects invalid operator `01234567890`. | **PASS** |
| 2 | OTP Request Hashing | Challenge stored with SHA-256 hash; zero plaintext OTP leaked in database. | **PASS** |
| 3 | Cooldown Enforcement | Second request within 60s returns `429 Too Many Requests` with remaining seconds. | **PASS** |
| 4 | Invalid Code & Counter | Incorrect OTP increments attempt counter and returns remaining attempts count. | **PASS** |
| 5 | Brute-Force Lockout | Challenge permanently rejected and invalidated after 3 failed attempts. | **PASS** |
| 6 | Expired OTP Rejection | OTP with expired timestamp rejected with `400 Bad Request`. | **PASS** |
| 7 | User Registration | Creates user with dual English and Bengali names (`fullNameBn`), creates profile, assigns default `CUSTOMER` role. | **PASS** |
| 8 | One-Time-Use Validation | Consumed OTP code cannot be reused for a second verification. | **PASS** |
| 9 | Refresh Token Rotation | Valid refresh token yields new pair, increments rotation counter, keeps family ID. | **PASS** |
| 10 | Replay Attack Revocation | Replaying an already-rotated refresh token detects replay, logs security alert, and revokes all active sessions in the family. | **PASS** |
| 11 | Session Revocation | Logging out a session marks it revoked; rotated token can no longer be used. | **PASS** |
| 12 | Profile Update Audit | Updating Bengali name (`মোহাম্মদ হাসান`) updates database and records security event. | **PASS** |
| 13 | Access Token Validation | Malformed, expired, or tampered JWTs rejected with `401 Unauthorized`. | **PASS** |
| 14 | RBAC Authorization | Verifies user has `CUSTOMER` role and is blocked from `PLATFORM_ADMIN` protected routes. | **PASS** |

**Summary: 14 tests, 1 suite, 14 passed, 0 failed (Duration: 30.4s).**

---

## 7. Client Applications Implementation

### 7.1 Web Application (`apps/web`)
- **Framework:** Next.js 16.4.6 with App Router and Turbopack.
- **Routes Implemented:**
  - `/(auth)/login`: Phone entry with operator code hint, 60s cooldown timer, and automatic redirect.
  - `/(auth)/verify-otp`: 6-digit numeric input with auto-submission, remaining attempts indicator, and resend button.
  - `/(auth)/register`: Profile registration supporting English Full Name, Bangla Full Name (`নাম বাংলায়`), and language selection.
  - `/profile`: Authenticated user dashboard displaying user status, phone, roles, and profile editing form.
  - `/components/navbar`: Dynamic top navigation displaying active login status, user name, and direct logout action.
- **Build Status:** Compiled successfully into 10 static/dynamic routes (`pnpm --filter @bdmart/web build` passed).

### 7.2 Mobile Application (`apps/mobile`)
- **Framework:** Expo SDK 58.0.35, React Native 0.88.2, React 19.3.0, Expo Router 58.0.31.
- **Token Storage:** Native hardware keystore / keychain via `expo-secure-store` ([`apps/mobile/lib/secure-store.ts`](file:///d:/Project/BDMart/apps/mobile/lib/secure-store.ts)).
- **Screens Implemented:**
  - `/(auth)/login.tsx`: Clean mobile login UI with Bangladesh phone formatting.
  - `/(auth)/verify-otp.tsx`: OTP input screen with countdown timer and attempt tracking.
  - `/(auth)/register.tsx`: Mobile registration form with dual-language name support.
  - `/profile.tsx`: Native profile view with status badges and logout.
- **Verification Status:**
  - `npx expo-doctor`: **20/20 checks passed cleanly**.
  - Metro Bundle Export: Exported 1,133 modules cleanly (1.6 MB bundle, 26 assets, Exit 0).

---

## 8. Code Quality & Monorepo Health Metrics

```
Command                  Result
────────────────────────────────────────────────────────
pnpm typecheck           9/9 packages passed (0 errors)
pnpm lint                6/6 packages passed (0 errors, 0 warnings)
pnpm format:check        100% matched Prettier code style
pnpm build               6/6 build tasks succeeded
expo-doctor              20/20 diagnostics passed
test/security.test.ts    14/14 security integration tests passed
git status               No untracked credentials or .env files
```

---

## 9. Next Steps

Milestone 2 is completely implemented, verified, and stabilized.

Per explicit engineering governance rules:
> **STOP after Milestone 2 and await explicit user instruction before proceeding to Milestone 3 (Seller Onboarding, Verification & KYC Architecture).**

