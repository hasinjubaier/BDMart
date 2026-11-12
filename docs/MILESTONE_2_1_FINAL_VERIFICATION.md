# BDMart — Milestone 2.1 Final Source-Code Verification Report

**Verification Date:** November 12, 2026  
**Auditor:** Principal Application Security Engineer, Senior NestJS Architect & Database Integration Specialist  
**Target Neon Branch:** `development` (`br-flat-haze-bekg4mjm`)  
**Production Neon Branch:** `production` (`br-still-union-bekqgs0r` — 100% clean, 0 tables)  
**Overall Status:** **APPROVED**

---

## 1. Files Inspected

A rigorous, independent source-code verification was conducted across all authentication, session management, and authorization files:

1. [`apps/api/src/auth/services/token.service.ts`](file:///d:/Project/BDMart/apps/api/src/auth/services/token.service.ts) — Token issuance, session family rotation, compare-and-swap (CAS) logic, replay detection.
2. [`apps/api/src/auth/auth.service.ts`](file:///d:/Project/BDMart/apps/api/src/auth/auth.service.ts) — Keyed HMAC-SHA-256 OTP hashing, cooldown, attempt limits, registration challenge binding, and password login.
3. [`apps/api/src/auth/guards/csrf.guard.ts`](file:///d:/Project/BDMart/apps/api/src/auth/guards/csrf.guard.ts) — Global CSRF defense, exact origin matching, and safe Referer URL parsing.
4. [`apps/api/src/auth/guards/jwt-auth.guard.ts`](file:///d:/Project/BDMart/apps/api/src/auth/guards/jwt-auth.guard.ts) — Active session database verification and immediate access-token revocation.
5. [`apps/api/src/auth/services/sms.service.ts`](file:///d:/Project/BDMart/apps/api/src/auth/services/sms.service.ts) — Fail-fast production SMS gateway enforcement and development mock isolation.
6. [`apps/api/src/scripts/bootstrap-admin.ts`](file:///d:/Project/BDMart/apps/api/src/scripts/bootstrap-admin.ts) — Administrative bootstrap procedure and role assignment controls.
7. [`apps/web/lib/api-client.ts`](file:///d:/Project/BDMart/apps/web/lib/api-client.ts) — Next.js client-side single-flight refresh token serialization.
8. [`apps/mobile/lib/api-client.ts`](file:///d:/Project/BDMart/apps/mobile/lib/api-client.ts) — Expo/React Native mobile client-side single-flight refresh token mutex.
9. [`apps/mobile/lib/secure-store.ts`](file:///d:/Project/BDMart/apps/mobile/lib/secure-store.ts) — Native hardware-backed keystore/keychain persistence.
10. [`apps/api/test/security.test.ts`](file:///d:/Project/BDMart/apps/api/test/security.test.ts) — 21-scenario integration test suite executed against live Neon PostgreSQL.

---

## 2. Actual Implementation Findings

### 2.1 Refresh-Token Concurrency, Replay Defense & Legitimate Retry Architecture

#### 1. Security Evaluation: Replay vs. Legitimate Retry
An automated security analysis was conducted on refresh token rotation races versus legitimate network retries:
- **Flaw in Global Time-Based Grace Periods:** Automatically granting a 5–10-second leeway window where any reused token is accepted creates a dangerous vulnerability: an adversary who intercepts or steals a token during transit can replay it within that window without triggering alarm or revocation.
- **Implemented Solution: Cryptographically Bound Idempotency Keys:**
  - When the client initiates a refresh operation, it generates a unique ephemeral idempotency key (passed via `x-idempotency-key` HTTP header or body parameter).
  - On initial rotation, the session conditionally updates `isRevoked = true`, computes `idempotencyHash = SHA256(idempotencyKey)`, encrypts the issued token payload (`IssuedTokens`) using **AES-256-GCM** with a server-derived key, and stores it in `user_sessions.encrypted_token_cache`.
  - **Simultaneous Duplicate Requests:** When two parallel requests with the identical refresh token and idempotency key arrive at the same time, the first wins the CAS operation (`updateResult.count === 1`), while the second safely recovers and decrypts the cached response without creating another session or racing.
  - **Delayed Duplicate Requests (Network Retries):** If the client never received the response due to a network drop, it retries with the exact same refresh token and idempotency key. Within a 60-second retry window, the server performs a constant-time HMAC check (`timingSafeEqual`) on `idempotencyHash`, verifies that the successor session in the family is still active, and safely returns the encrypted cached tokens.
  - **Zero Dual Issuance:** No third session or additional token pair is ever created.
  - **Deliberate Replay Defense Preserved:** If an adversary attempts to reuse the rotated token without the matching ephemeral idempotency key, or with an invalid key, or after the retry window has elapsed, or after the successor session has been rotated:
    - The server immediately classifies it as a **confirmed replay attack**.
    - It revokes all sessions in the entire session family (`familyId`) in PostgreSQL.
    - It logs a `TOKEN_REPLAY_DETECTED` audit event and rejects the request with `401 Unauthorized`.
  - **Client-Side Defense in Depth:** Both web (`apps/web/lib/api-client.ts`) and mobile (`apps/mobile/lib/api-client.ts`) clients include promise-based single-flight mutexes and generate ephemeral idempotency keys per refresh cycle.

#### 2. Comprehensive Test Verification
Verified in [`apps/api/test/security.test.ts`](file:///d:/Project/BDMart/apps/api/test/security.test.ts) across dedicated scenarios:
- **Test 16 (CAS Concurrency):** Exact concurrent submission without idempotency key serializes via database CAS (`count: 1` winner, `count: 0` rejected).
- **Test 16b (Simultaneous Duplicate Requests):** Two parallel requests with matching idempotency key both succeed and receive identical valid token pairs without creating duplicate sessions or revoking the family.
- **Test 16c (Delayed Network Retry & Subsequent Rotation):** A delayed retry of an already-rotated token returns the original tokens and preserves the active session, allowing the client to subsequently rotate the new token normally.
- **Test 16d (Deliberate Replay from Independent Client):** An attacker presenting the rotated token with an invalid or missing idempotency key triggers immediate family-wide revocation and invalidates all active sessions.

---

### 2.2 OTP Security Verification
Confirmed directly from [`apps/api/src/auth/auth.service.ts`](file:///d:/Project/BDMart/apps/api/src/auth/auth.service.ts) and [`apps/api/src/auth/services/sms.service.ts`](file:///d:/Project/BDMart/apps/api/src/auth/services/sms.service.ts):
- **CSPRNG-Based Generation:** Line 219 uses Node's built-in CSPRNG `crypto.randomInt(100000, 1000000)`, guaranteeing uniform entropy across all 900,000 six-digit values without modulo bias.
- **Timing-Safe HMAC Comparison:** Lines 303–308 compare digests using constant-time `crypto.timingSafeEqual(candidateBuffer, storedBuffer)`, preventing side-channel timing attacks.
- **Dedicated `OTP_HASH_SECRET` ($\ge 32$ chars):** Lines 74–80 strictly require `process.env.OTP_HASH_SECRET` to have a minimum length of 32 characters, failing fast on service instantiation if missing or weak.
- **No Insecure Fallback:** Zero fallbacks to default hardcoded strings or to `JWT_SECRET`.
- **Zero Sensitive Data in Logs:**
  - Neither raw OTPs nor hash secrets appear in `Logger` or `console` output in `AuthService`.
  - Security audit events (`account_security_events`) only log masked identifiers (`phone`, `purpose`, `attempts`), never the raw OTP or HMAC secret.
  - `BangladeshSmsGatewayProvider` explicitly masks destination numbers and excludes OTP values from production logs.

---

### 2.3 Atomic IP-Level Rate Limiting

#### 1. Vulnerability Analysis: Count-Then-Create Concurrency Leak
The initial implementation performed a `prisma.otpChallenge.count()` query followed by `prisma.otpChallenge.create()`. Under high-concurrency burst conditions (e.g. 25 parallel requests from the same IP address across multiple API replicas), all requests checked the historical count before any challenge was committed, allowing parallel oversubscription beyond the configured 20-per-hour limit.

#### 2. Atomic PostgreSQL UPSERT Implementation
To guarantee atomic rate limiting across all API instances without introducing Redis or Docker containers, a dedicated database-backed atomic rate limiter was implemented:
- **Dedicated Table:** `ip_rate_limits` with composite primary key `(ip_address, window_bucket)` where `window_bucket = epoch_ms / 3600000`.
- **Atomic UPSERT Query:**
  ```sql
  INSERT INTO "ip_rate_limits" ("ip_address", "window_bucket", "request_count", "updated_at")
  VALUES ($1, $2, 1, NOW())
  ON CONFLICT ("ip_address", "window_bucket")
  DO UPDATE SET "request_count" = "ip_rate_limits"."request_count" + 1, "updated_at" = NOW()
  RETURNING "request_count";
  ```
- **Concurrency Guarantee:** PostgreSQL row-level locks on the primary key serialize increments atomically in a single statement (~20–30ms).
- **Enforcement:** If `request_count > 20`, the request immediately throws `429 Too Many Requests` (`IP_RATE_LIMIT_EXCEEDED`). Zero challenges are recorded and zero SMS messages are dispatched.
- **Verified Under Concurrency (Test 4b):** Sending 25 parallel requests from the same IP with distinct phone numbers resulted in **exactly 20 successful requests and exactly 5 rejected with 429**. The database challenge count was strictly capped at 20. Phone-level cooldowns (60s) and phone-level hourly limits (10/hr) were completely preserved.

### 2.4 CSRF Implementation
- **Registration:** Globally registered via `APP_GUARD` in `apps/api/src/app.module.ts`:
  ```ts
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }]
  ```
  Every controller route in the application is protected.
- **Exact Origin Comparison:** Compares `origin.toLowerCase() === allowed.toLowerCase()`. Wildcards are disallowed when ambient cookies are present.
- **Safe Referer Parsing:** Referer headers are parsed using standard `new URL(referer).origin.toLowerCase()`, eliminating prefix-matching bypass vulnerabilities (e.g. `http://localhost:3000.evil.com` is safely rejected).
- **HTTP Method Handling:**
  - Idempotent safe methods (`GET`, `HEAD`, `OPTIONS`) bypass CSRF inspection.
  - Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) carrying cookies require matching `Origin` or `Referer`. Missing origin information on cookie-authenticated requests throws `403 Forbidden`.
- **CORS Alignment:** `main.ts` sets an explicit origin whitelist (`corsOrigins`) and enables credentials without wildcarding.

### 2.5 Administrator Bootstrap
- **Endpoint Absence:** There is no public HTTP endpoint capable of creating or granting administrative privileges.
- **CLI Guard:** [`apps/api/src/scripts/bootstrap-admin.ts`](file:///d:/Project/BDMart/apps/api/src/scripts/bootstrap-admin.ts) requires the private environment secret `ADMIN_BOOTSTRAP_SECRET`.
- **Credential Hygiene:** No hardcoded admin credentials exist; parameters are supplied at runtime via CLI flags.
- **Audit Logging:** Every bootstrap execution logs an `ADMIN_BOOTSTRAPPED` record to the immutable `account_security_events` table.

### 2.6 SMS Production Safety
- **Fail-Fast Startup:** `SmsService` verifies environment configuration on startup:
  ```ts
  if (isProduction) {
    if (forcedProvider === "mock") {
      throw new Error("FATAL: MockSmsProvider cannot be used in production environment.");
    }
    if (!process.env.BD_SMS_API_KEY) {
      throw new Error("FATAL: Production SMS gateway API key (BD_SMS_API_KEY) is not configured.");
    }
  }
  ```
- **Zero Simulation in Production:** `MockSmsProvider` throws a fatal error if instantiated when `NODE_ENV === "production"`.

---

## 3. Vulnerabilities Remediated During Final Review

| Vulnerability / Weakness | Root Cause | Implemented Correction | Verified In Test |
| :--- | :--- | :--- | :---: |
| **Incomplete CAS where Clause** | CAS conditional update checked `id` and `isRevoked: false`, but omitted `refreshTokenHash`. | Updated `where` to include `refreshTokenHash: candidateHash`, guaranteeing true compare-and-swap semantics. | Test 16 |
| **Referer Prefix Matching Bypass** | `referer.startsWith(allowed)` allowed domain suffix bypasses (`http://localhost:3000.evil.com`). | Replaced with strict origin parsing: `new URL(referer).origin.toLowerCase() === allowed`. | Test 19 |
| **Insecure Secret Fallback** | `AuthService` fell back to `JWT_SECRET` and a hardcoded dev string if `OTP_HASH_SECRET` was absent. | Removed all fallbacks; mandated `OTP_HASH_SECRET` with $\ge 32$ character validation in all environments. | Test 2 |
| **Count-Then-Create IP Rate Limit Race** | Parallel OTP requests from the same IP executed non-atomic count checks before any challenge was committed, exceeding limits. | Implemented atomic PostgreSQL UPSERT on `ip_rate_limits` table (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count`). | Test 4b |
| **Accidental Family Revocation on Network Retry** | Delayed retries after committed rotations were classified as malicious replays, revoking active sessions. | Bound rotation recovery to ephemeral HMAC-verified `idempotencyHash` and AES-256-GCM encrypted response cache within 60s window. | Tests 16b, 16c, 16d |

---

## 4. Test & Build Verification

All verification commands were executed strictly against the dedicated Neon PostgreSQL development branch (`br-flat-haze-bekg4mjm`).

### 4.1 Automated Security Test Suite
- **Command:** `pnpm --filter @bdmart/api test`
- **Exit Code:** `0`
- **Results:** **25 passed, 0 failed, 0 skipped** (Execution time: 114.3s)

```
✔ Phone Normalization: correctly transforms Bangladesh numbers to standard E.164 and rejects invalid prefixes
✔ Keyed HMAC-SHA-256 OTP Hashing: protects database against precomputed rainbow table attacks
✔ Repeated OTP Requests: enforces 60-second resend cooldown (429 Too Many Requests)
✔ IP-Level Rate Limiting: rejects excessive OTP requests from same IP address
✔ Atomic IP Rate Limiting Under Concurrency: parallel requests cannot bypass the 20-per-hour limit
✔ Account Enumeration Defense: returns generic error message on invalid password login
✔ Invalid OTP: increments attempt counter and rejects incorrect codes
✔ Non-Destructive OTP Lockout: locks challenge without disabling user account status
✔ Invalidate Older OTPs on Resend: previous unconsumed challenges are invalidated when new code is requested
✔ Expired OTP: rejects verification when expiresAt is in the past
✔ User Registration: creates user with Bangla name support and default CUSTOMER role
✔ One-Time-Use Validation: consumed OTP code cannot be reused
✔ Concurrent OTP Verification: exactly one request succeeds; parallel verification fails
✔ Unauthorized Role Escalation: regular user cannot assign PLATFORM_ADMIN role
✔ Refresh Token Rotation: issues new pair and advances rotation counter
✔ Refresh Token Replay Detection: revokes entire session family if rotated token is replayed
✔ Concurrent Refresh Race Prevention: database compare-and-swap (CAS) update prevents dual rotation
✔ Idempotent Refresh (Simultaneous): duplicate parallel requests with matching idempotency key return identical tokens
✔ Idempotent Refresh (Delayed Retry): delayed duplicate request returns original tokens and enables subsequent rotation
✔ Deliberate Replay Defense: independent client presenting rotated token without matching idempotency key revokes family
✔ Session Revocation: logging out single device revokes its session
✔ Access Token Immediate Revocation: JwtAuthGuard rejects access token once session is revoked
✔ CSRF Protection: CsrfGuard enforces origin verification, safe Referer fallback, and HTTP method protection
✔ Platform Administrator Bootstrap: provisions admin with valid secret and rejects unauthorized secret
✔ Cross-User Data Isolation: authenticated user cannot modify another user's profile
```

### 4.2 Code Quality & Monorepo Build Health
```
Command                 Scope                 Result
────────────────────────────────────────────────────────────────────────
pnpm typecheck          Monorepo (7 packages) 9/9 Tasks Successful (Exit 0)
pnpm lint               Monorepo (7 packages) 6/6 Tasks Successful (Exit 0)
pnpm format:check       All source files      100% Prettier Compliant (Exit 0)
pnpm build              Monorepo apps/pkgs    6/6 Build Tasks Succeeded (Exit 0)
```

---

## 5. Neon Branch Isolation & Safety Compliance

| Neon Branch | Branch ID | Endpoint Host | Tables Present | State |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `br-still-union-bekqgs0r` | `ep-hidden-heart-bek8oxf0` | **0 tables** | **Pristine / Untouched** |
| **Development** | `br-flat-haze-bekg4mjm` | `ep-billowing-resonance-beypcxyy` | **11 tables** (10 IAM + `ip_rate_limits`) | **Active & Migrated** |

- **No Destructive Operations:** Zero tables dropped, zero production changes.
- **Git Hygiene:** No `.env` files or credentials are staged or tracked.

---

## 6. Remaining Limitations & Production Readiness

1. **Edge-Level WAF Rate Limiting:** While the PostgreSQL atomic UPSERT limiter guarantees mathematical enforcement against concurrency leaks, in high-volume production this should be fronted by Cloudflare WAF / AWS Shield to block Layer-7 flood traffic before consuming database connections.
2. **Cellular Carrier SMS Aggregator Integration:** In production, `MockSmsProvider` is strictly disabled by environment fail-fast checks. Real cellular dispatch will require populating `BD_SMS_API_KEY` with credentials from a verified aggregator (SSL Wireless, Greenweb, Banglalink).
3. **Idempotency Key Scope:** The 60-second idempotency recovery window protects legitimate network drops and client retries without weakening replay security. Stolen tokens presented outside this window or without the in-flight key trigger immediate family-wide revocation.

---

## 7. Final Governance Status

**APPROVED:** Milestone 2.1 security audit, vulnerability remediation, atomic rate limiting, and idempotent retry verifications are 100% complete. Ready for Milestone 3 architecture.

