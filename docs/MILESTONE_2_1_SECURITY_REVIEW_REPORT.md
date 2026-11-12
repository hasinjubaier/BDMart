# BDMart — Milestone 2.1 Security Audit & Stabilization Report

**Audit Date:** November 12, 2026  
**Auditor Roles:** Principal Application Security Engineer, Senior NestJS Architect, Senior React Native Engineer, Identity Management Specialist  
**Milestone:** Milestone 2.1 (Security Audit, Vulnerability Remediation & Verification)  
**Target Environment:** Dedicated Neon PostgreSQL `development` branch (`br-flat-haze-bekg4mjm`)  
**Production Isolation:** Neon `production` branch (`br-still-union-bekqgs0r` — 100% clean, 0 tables)  
**Overall Security Status:** **PASSED & VERIFIED (21/21 Automated Security Tests Passing)**

---

## 1. Source-Code Audit Findings

A comprehensive line-by-line audit of the Milestone 2 authentication implementation was performed across backend, database, shared contracts, web frontend, and mobile clients:

| Component | Target File | Audit Assessment |
| :--- | :--- | :--- |
| **Authentication Service** | `apps/api/src/auth/auth.service.ts` | Discovered unkeyed/fallback OTP secret vulnerability, unindexed multi-active challenge collision on resend, lack of IP-level rate limiting, and an OTP verification bypass during registration. |
| **Session & Token Service** | `apps/api/src/auth/services/token.service.ts` | Discovered critical Prisma transaction rollback vulnerability where replay detection failed to persist family revocation across rollbacks. Resolved via direct DB commit before rejection and atomic conditional updates. |
| **SMS Delivery Service** | `apps/api/src/auth/services/sms.service.ts` | Discovered potential mock-provider leak in production if credentials omitted. Hardened with fail-fast constructor checks that abort startup in production if `MockSmsProvider` is active or API keys are missing. |
| **JWT Guard** | `apps/api/src/auth/guards/jwt-auth.guard.ts` | Discovered stateless JWT vulnerability where access tokens could not be revoked prior to their 15-minute expiration. Added real-time database session verification to provide immediate access token revocation upon logout. |
| **Role Guard & RBAC** | `apps/api/src/auth/guards/roles.guard.ts` | Verified authorization boundaries. Regular `CUSTOMER` users are strictly blocked from `PLATFORM_ADMIN` and `SUPPORT_OPERATOR` administrative endpoints. |
| **CSRF Defense** | `apps/api/src/auth/guards/csrf.guard.ts` (New) | Implemented strict Origin and Referer validation on state-changing HTTP requests carrying ambient cookies. Unauthenticated cross-origin or mismatched origin requests are rejected with `403 Forbidden`. |
| **Admin Bootstrap** | `apps/api/src/scripts/bootstrap-admin.ts` (New) | Isolated initial administrative provisioning to a restricted CLI script governed by `ADMIN_BOOTSTRAP_SECRET`. |
| **Web API Client** | `apps/web/lib/api-client.ts` | Identified parallel 401 refresh token race condition. Implemented client-side single-flight promise serialization. |
| **Mobile API Client** | `apps/mobile/lib/api-client.ts` | Implemented single-flight refresh mutex to prevent parallel refresh races in React Native. |
| **Mobile Storage** | `apps/mobile/lib/secure-store.ts` | Evaluated Android Keystore and iOS Keychain hardware-backed storage guarantees. |

---

## 2. Vulnerabilities Discovered & Severity Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DISCOVERED VULNERABILITIES                      │
├───────┬────────────────────────────────────────┬───────────┬───────────┤
│ ID    │ Description                            │ Severity  │ Status    │
├───────┼────────────────────────────────────────┼───────────┼───────────┤
│ VUL-1 │ Unkeyed/Fallback OTP Secret Hash       │ HIGH      │ RESOLVED  │
│ VUL-2 │ Registration OTP Verification Bypass   │ CRITICAL  │ RESOLVED  │
│ VUL-3 │ Replay Revocation Rolled Back by Tx    │ HIGH      │ RESOLVED  │
│ VUL-4 │ Concurrent Refresh Race Condition      │ MEDIUM    │ RESOLVED  │
│ VUL-5 │ Stateless JWT Lacked Revocation        │ MEDIUM    │ RESOLVED  │
│ VUL-6 │ SMS Toll Fraud / Lack of IP Throttling │ MEDIUM    │ RESOLVED  │
│ VUL-7 │ Coexisting Active OTPs on Resend       │ MEDIUM    │ RESOLVED  │
│ VUL-8 │ Mock SMS Provider Allowed in Prod      │ HIGH      │ RESOLVED  │
│ VUL-9 │ Ambient Cookie CSRF Exposure           │ HIGH      │ RESOLVED  │
└───────┴────────────────────────────────────────┴───────────┴───────────┘
```

### Detailed Vulnerability Analysis:

1. **VUL-1: Weak / Unkeyed OTP Secret Storage (High)**
   - *Discovery:* `AuthService` initialized `this.otpSecret` with fallback to `JWT_SECRET` or a hardcoded string. If leaked, an attacker could precompute a rainbow table of all 900,000 possible 6-digit OTP codes in seconds.
   - *Correction:* Mandated dedicated keyed HMAC-SHA-256 using `OTP_HASH_SECRET`. Enforced fail-fast startup in production if `OTP_HASH_SECRET` is absent.

2. **VUL-2: Registration OTP Verification Bypass (Critical)**
   - *Discovery:* In `auth.service.ts::register()`, the code checked whether *any* challenge for that phone was consumed within the last 15 minutes (`otpChallenge.findFirst({ where: { phone, consumedAt: { gte: fifteenMinutesAgo } } })`). Because it did not verify the submitted candidate OTP hash against that specific challenge, an attacker could supply any arbitrary code (e.g., `000000`) if an earlier OTP had been consumed within 15 minutes.
   - *Correction:* Bound registration verification strictly to matching `phone` AND `otpHash === candidateHash`. Once registered, all unconsumed challenges for that phone are invalidated.

3. **VUL-3: Refresh Token Replay Revocation Rolled Back by Transaction (High)**
   - *Discovery:* When an adversary replayed an old refresh token, `TokenService.rotateRefreshToken` executed `tx.userSession.updateMany({ where: { familyId }, data: { isRevoked: true } })` inside a Prisma `$transaction`, and then threw `new UnauthorizedException(...)`. In Prisma, throwing an exception inside `$transaction` triggers an automatic SQL `ROLLBACK`. Consequently, the family revocation was rolled back in PostgreSQL, leaving active tokens in that family unrevoked!
   - *Correction:* Dispatched family revocation and security event logging directly to PostgreSQL before throwing the `UnauthorizedException`, ensuring that the family revocation is permanently committed.

4. **VUL-4: Concurrent Refresh Request Race Condition (Medium)**
   - *Discovery:* Simultaneous 401 responses in multiple web tabs or parallel API calls sent duplicate refresh tokens. Without serialization, the second request hit the server after rotation and triggered a false-positive replay alert, logging out the user.
   - *Correction:* Implemented two-tiered defense:
     1. *Client-Side:* Single-flight refresh mutex in `apps/web/lib/api-client.ts` and `apps/mobile/lib/api-client.ts` ensuring only one refresh request is in flight.
     2. *Backend:* Atomic conditional update (`updateMany({ where: { id: session.id, isRevoked: false }, data: { isRevoked: true } })`) inside transaction. If update count is 0, the duplicate is cleanly rejected.

5. **VUL-5: Stateless Access Tokens Lacked Immediate Revocation (Medium)**
   - *Discovery:* Once issued, 15-minute JWTs were valid until expiration even after the user logged out (`logout` or `logoutAll`) or had their account deactivated.
   - *Correction:* Hardened `JwtAuthGuard` to verify `payload.sessionId` in the database in real time. If `userSession.isRevoked` is true, the request is immediately rejected with `401 Unauthorized`.

6. **VUL-6: SMS Toll Fraud via Unthrottled IP Requests (Medium)**
   - *Discovery:* Throttling was only enforced per phone number. A malicious actor could request OTPs for 10,000 distinct phone numbers from a single IP, causing SMS financial exhaustion.
   - *Correction:* Implemented IP-level rate limiting in `requestOtp`: maximum 20 OTP requests per hour per IP address.

7. **VUL-7: Multiple Active Unconsumed OTPs on Resend (Medium)**
   - *Discovery:* When requesting a new OTP after the 60s cooldown, older unconsumed challenges remained active until their 5-minute expiration, creating multiple valid codes for the same phone number.
   - *Correction:* In `requestOtp`, all prior unconsumed challenges for that phone number are automatically invalidated (`consumedAt = now`) before the new challenge is recorded.

8. **VUL-8: Mock SMS Provider Production Leakage (High)**
   - *Discovery:* If `BD_SMS_API_KEY` was missing in production, `BangladeshSmsGatewayProvider` fell back to `MockSmsProvider` which logged the raw OTP.
   - *Correction:* Hardened `SmsService` and `MockSmsProvider` constructors to throw fatal startup exceptions if `process.env.NODE_ENV === "production"` and the mock provider is selected or gateway API keys are missing. Raw OTP codes are never logged in production.

9. **VUL-9: Ambient Cookie CSRF Exposure (High)**
   - *Discovery:* Mutating endpoints (`POST`, `PATCH`, `DELETE`) accepting HttpOnly cookies could be targeted by cross-origin requests from malicious third-party origins.
   - *Correction:* Created and globally registered `CsrfGuard`. Any mutating request carrying ambient auth cookies must present an `Origin` or `Referer` matching the whitelisted `CORS_ORIGINS`.

---

## 3. OTP Security Design

### 3.1 Keyed HMAC-SHA-256 Storage
- **Algorithm:** `HMAC-SHA-256` using server-side secret `OTP_HASH_SECRET`.
- **Entropy & Precomputation Resistance:** Six-digit numeric OTPs possess $10^6$ combinations. An unkeyed SHA-256 hash can be reversed in milliseconds via rainbow tables. Keyed HMAC-SHA-256 binds each OTP to the secret key, preventing offline precomputation if the database is leaked.
- **Timing-Safe Comparison:** Compares candidate hash buffers using `crypto.timingSafeEqual(candidateBuffer, storedBuffer)` to prevent timing side-channel attacks.

### 3.2 Six-Digit Format Evaluation
- **Analysis:** Retained the 6-digit numeric format (`100000` to `999999`).
- **Rationale:** 
  1. *Telecom & UX Compatibility:* In Bangladesh, all major fintech and telco platforms (bKash, Nagad, Banglalink, Grameenphone) standardize on 4 or 6-digit numeric OTPs. 6 digits integrates natively with Android SMS Retriever API and iOS AutoFill.
  2. *Online Entropy:* Combined with a 60-second cooldown, max 3 attempts per challenge, and 5-minute expiry, the probability of an online brute-force guess is $\frac{3}{900,000} \approx 0.00033\%$ per challenge.

---

## 4. Session & Refresh Token Security Architecture

```
[ Normal Rotation Flow ]
Client sends Refresh Token (RT_1)
        │
        ├── DB checks: RT_1 valid and isRevoked == false
        ├── Atomic Transaction: updateMany(id: session_1, isRevoked: false -> true)
        ├── Issues new pair: AT_2 + RT_2 (linked to same familyId, rotationCounter + 1)
        └── Client receives AT_2 + RT_2

[ Replay Attack Detected ]
Attacker sends already-rotated Refresh Token (RT_1)
        │
        ├── DB detects: RT_1 found, but isRevoked == true!
        ├── Immediate Database Commit: updateMany(where: { familyId }, isRevoked: true)
        ├── Records security event: TOKEN_REPLAY_DETECTED
        └── Returns 401 Unauthorized (All active sessions in family are revoked)
```

- **Single-Flight Refresh:** Web and mobile API clients queue parallel 401s behind a single in-flight `refreshPromise`, preventing concurrent rotation races.
- **Immediate Access Token Revocation:** `JwtAuthGuard` verifies session status on every protected request. Revoking a session immediately denies further access token usage.

---

## 5. Web CSRF & Cookie Security Design

### 5.1 Cookie Configuration
- **Access Token:** `HttpOnly: true`, `Secure: isProduction`, `SameSite: "lax"`, `Path: "/"`, `Max-Age: 15m`.
- **Refresh Token:** `HttpOnly: true`, `Secure: isProduction`, `SameSite: "lax"`, `Path: "/api/v1/auth"`, `Max-Age: 7d`.

### 5.2 Deployment Domain Architecture (Vercel vs Render)
- **Problem Statement:** If the Next.js frontend is deployed on Vercel (`app.vercel.app`) and the NestJS backend is deployed on Render (`api.onrender.com`), both are distinct public suffixes on the Public Suffix List (PSL).
- **Domain Constraints:**
  - `SameSite=Lax` cookies will NOT be sent by browsers on cross-site asynchronous `fetch` requests across different apex domains.
  - Setting `SameSite=None; Secure` allows cross-site cookies, but Safari ITP and modern Chrome Privacy Sandbox policies increasingly partition or block third-party cookies by default.
- **Production Recommendation:**
  - **Option A (Preferred):** Unified Apex Domain with Subdomains. Deploy both frontend and backend under the same custom parent domain (e.g., `app.bdmart.com.bd` and `api.bdmart.com.bd`), setting cookie domain to `.bdmart.com.bd`.
  - **Option B (Alternative):** Next.js Backend-For-Frontend (BFF) proxy route (`/api/*` rewritten to backend), ensuring all browser traffic is first-party same-origin.

---

## 6. Mobile Token Storage Verification

### 6.1 `expo-secure-store` Platform Guarantees
- **iOS Keychain:** Tokens are stored in Keychain Services (`kSecClassGenericPassword`), protected by hardware Secure Enclave using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Keys are inaccessible when the device is locked and excluded from unencrypted iTunes/iCloud backups.
- **Android Keystore:** Tokens are encrypted with AES-256 GCM via `EncryptedSharedPreferences`. Encryption keys reside in the hardware-backed Android KeyStore (TEE / StrongBox Keymaster on supported hardware).
- **Realistic Limitations:** On rooted Android devices or jailbroken iOS devices, processes running with root or debug permissions can hook runtime memory or dump keystores. Platform security guarantees apply to non-rooted consumer hardware.

### 6.2 Physical Android Test Procedure
To verify mobile authentication on a physical Android device:
1. Ensure the Android device and development workstation are on the same local Wi-Fi network.
2. In `apps/mobile/.env`, set `EXPO_PUBLIC_API_URL=http://<WORKSTATION_LAN_IP>:4000/api`.
3. In `apps/api/.env`, ensure `CORS_ORIGINS` includes the mobile app origin or LAN address.
4. Run `pnpm --filter @bdmart/mobile start`.
5. Scan the QR code using Expo Go on the physical Android device.
6. Test: Phone OTP request -> OTP verification -> SecureStore token persistence -> App force-kill -> App restart (verify session restores without re-prompt) -> Logout (verify SecureStore is cleared).

---

## 7. RBAC & Administrator Protection

1. **Self-Escalation Immunity:** `RegisterUserSchema` and `UpdateProfileSchema` in `@bdmart/contracts` contain zero role or permission fields. Any role injection in HTTP payloads is stripped by Zod validation.
2. **Default Customer Role:** All public registrations assign strictly `CUSTOMER`.
3. **Restricted Admin Bootstrap:** The initial administrator cannot be provisioned via public HTTP endpoints. An administrative CLI script `apps/api/src/scripts/bootstrap-admin.ts` (`pnpm --filter @bdmart/api bootstrap:admin`) requires the private environment secret `ADMIN_BOOTSTRAP_SECRET`.
4. **Independent Guard Checks:** Every protected controller method is guarded by `JwtAuthGuard` and `RolesGuard`, verifying the authenticated user's database role and active session.

---

## 8. Automated Security Test Results

The expanded Milestone 2.1 security test suite was executed against the live Neon PostgreSQL development branch (`br-flat-haze-bekg4mjm`).

**Command:** `pnpm --filter @bdmart/api test`  
**Exit Code:** `0` (Success)  
**Total Tests:** 21  
**Passed:** 21  
**Failed:** 0  
**Execution Duration:** 76.5 seconds  

| # | Test Case Description | Verified Security Invariant | Status |
| :---: | :--- | :--- | :---: |
| 1 | Phone Normalization | Transforms BD phones to E.164 (+8801[3-9]XXXXXXXX); rejects invalid operators (`012`, `010`). | **PASS** |
| 2 | Keyed HMAC-SHA-256 Hashing | Verified 64-char hex HMAC; differs from unkeyed SHA-256; zero plaintext in DB. | **PASS** |
| 3 | Cooldown Enforcement | Second request within 60s returns `429 Too Many Requests`. | **PASS** |
| 4 | IP-Level Rate Limiting | Rejects excessive requests (>20/hr) from the same IP address with `429 IP_RATE_LIMIT_EXCEEDED`. | **PASS** |
| 5 | Account Enumeration Defense | Generic error message returned on invalid phone or password login. | **PASS** |
| 6 | Attempt Counter Increment | Incorrect OTP increments attempt counter and tracks remaining attempts. | **PASS** |
| 7 | Non-Destructive Lockout | Lockout after 3 failed attempts invalidates challenge; user account remains `ACTIVE`. | **PASS** |
| 8 | Invalidate Older OTP on Resend | Requesting a new code marks all prior unconsumed challenges as consumed (`consumedAt != null`). | **PASS** |
| 9 | Expired OTP Rejection | OTP with expired timestamp rejected with `400 Bad Request`. | **PASS** |
| 10 | User Registration & Dual Language | Creates user with Bangla name support (`fullNameBn`) and assigns default `CUSTOMER` role. | **PASS** |
| 11 | One-Time-Use Validation | Consumed OTP code cannot be reused for a second verification. | **PASS** |
| 12 | Concurrent OTP Verification | Parallel verification requests on the same OTP permit exactly one success; duplicate fails. | **PASS** |
| 13 | Unauthorized Role Escalation | Regular user cannot grant themselves `PLATFORM_ADMIN` via profile update or registration. | **PASS** |
| 14 | Refresh Token Rotation | Issues new token pair, advances rotation counter, preserves session family ID. | **PASS** |
| 15 | Replay Detection & Family Revocation | Replaying an old refresh token permanently revokes all sessions in family in DB and logs alert. | **PASS** |
| 16 | Concurrent Refresh Race Prevention | Database conditional update and client single-flight handle concurrent refreshes cleanly. | **PASS** |
| 17 | Single-Device Session Revocation | Logging out a single device revokes its session; old token rejected. | **PASS** |
| 18 | Access Token Immediate Revocation | `JwtAuthGuard` checks DB session; revoked session immediately denies access token with 401. | **PASS** |
| 19 | Web CSRF Guard Protection | `CsrfGuard` blocks unauthorized origins (`evil.com`) and missing Origin on cookie requests. | **PASS** |
| 20 | Administrator Bootstrap | Provisions `PLATFORM_ADMIN` with valid secret; rejects unauthorized secret. | **PASS** |
| 21 | Cross-User Data Isolation | Authenticated User A cannot modify or overwrite User B's profile. | **PASS** |

---

## 9. Neon Branch Isolation & Safety Verification

| Database Branch | Branch ID | Target Host | Table Count | Migration / Data State |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `br-still-union-bekqgs0r` | `ep-hidden-heart-bek8oxf0` | **0 tables** | **100% Clean & Untouched** |
| **Development** | `br-flat-haze-bekg4mjm` | `ep-billowing-resonance-beypcxyy` | **10 tables** | **Active & Migrated** (9 IAM + `_prisma_migrations`) |

- **Zero Destructive SQL:** No tables were dropped or altered during the audit.
- **Git Hygiene:** No `.env` files or credentials are staged or tracked in version control.

---

## 10. Code Quality Metrics

```
Tool / Check             Scope              Result
──────────────────────────────────────────────────────────────────
pnpm typecheck           7 Packages / Monorepo   9/9 Tasks Successful (0 errors)
pnpm lint                7 Packages / Monorepo   6/6 Tasks Successful (0 errors, 0 warnings)
pnpm format:check        Full Monorepo           100% Prettier Compliant
pnpm build               Full Monorepo           6/6 Build Tasks Succeeded
Automated Security Tests apps/api/test           21/21 Tests Passed (Exit Code 0)
```

---

## 11. Remaining Production-Readiness Requirements

Before deploying to live production:
1. **SMS Gateway Procurement:** Integrate verified commercial credentials for Bangladesh telco aggregators (e.g., SSL Wireless, Greenweb, Banglalink, Grameenphone).
2. **Domain & DNS Alignment:** Establish custom apex domain (`bdmart.com.bd`) with SSL certificates to host frontend on `app.bdmart.com.bd` and API on `api.bdmart.com.bd`.
3. **Production Secrets Injection:** Generate 64-character cryptographically secure values for `JWT_SECRET`, `OTP_HASH_SECRET`, and `ADMIN_BOOTSTRAP_SECRET` via cloud secret manager (e.g., Render Secret Files, Doppler, or AWS Secrets Manager).

---

## 12. Strict Stop Declaration

Milestone 2.1 is fully executed, verified, and audited.

Per explicit governance instructions:
> **STOP after Milestone 2.1. Do NOT proceed to Milestone 3 (Seller Onboarding, Verification & KYC Architecture) until explicit user authorization is provided.**

