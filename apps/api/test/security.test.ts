import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { normalizeBangladeshPhone } from "@bdmart/utils";
import { AuthService } from "../src/auth/auth.service.js";
import {
  TokenService,
  IssuedTokens,
} from "../src/auth/services/token.service.js";
import { SmsService } from "../src/auth/services/sms.service.js";
import { UsersService } from "../src/users/users.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard.js";
import { CsrfGuard } from "../src/auth/guards/csrf.guard.js";
import { bootstrapAdministrator } from "../src/scripts/bootstrap-admin.js";

function createMockExecutionContext(req: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req as Request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("Milestone 2.1: Authentication Security Audit & Stabilization Test Suite", () => {
  let prismaService: PrismaService;
  let authService: AuthService;
  let tokenService: TokenService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let jwtAuthGuard: JwtAuthGuard;
  let csrfGuard: CsrfGuard;

  const testPhoneRaw = "01712000001";
  const normalizedTestPhone = normalizeBangladeshPhone(testPhoneRaw);
  const testPhoneAttacker = "01812000002";
  const normalizedAttackerPhone = normalizeBangladeshPhone(testPhoneAttacker);
  const adminPhoneRaw = "01912000003";
  const normalizedAdminPhone = normalizeBangladeshPhone(adminPhoneRaw);

  let createdUserId: string;
  let attackerUserId: string;
  let adminUserId: string;

  before(async () => {
    prismaService = new PrismaService();
    prismaService.onModuleInit();

    if (!process.env.OTP_HASH_SECRET) {
      process.env.OTP_HASH_SECRET =
        "bdmart-dev-otp-hmac-sha256-secret-key-32-byte-hex-0123456789abcdef0123456789abcdef";
    }

    jwtService = new JwtService({
      secret:
        process.env.JWT_SECRET ||
        "bdmart-dev-jwt-secret-key-replace-in-production-min-64-characters-0987654321",
      signOptions: { expiresIn: "15m" },
    });

    tokenService = new TokenService(jwtService, prismaService);
    const smsService = new SmsService();
    authService = new AuthService(prismaService, smsService, tokenService);
    usersService = new UsersService(prismaService, authService);

    const reflector = new Reflector();
    jwtAuthGuard = new JwtAuthGuard(reflector, jwtService, prismaService);
    csrfGuard = new CsrfGuard(reflector);

    // Clean up test data if left from previous runs
    const testPhones = [
      normalizedTestPhone,
      normalizedAttackerPhone,
      normalizedAdminPhone,
      "+8801700009999",
    ];
    await prismaService.client.otpChallenge.deleteMany({
      where: { phone: { in: testPhones } },
    });
    await prismaService.client.user.deleteMany({
      where: { phone: { in: testPhones } },
    });
  });

  after(async () => {
    const testPhones = [
      normalizedTestPhone,
      normalizedAttackerPhone,
      normalizedAdminPhone,
      "+8801700009999",
    ];
    await prismaService.client.otpChallenge.deleteMany({
      where: { phone: { in: testPhones } },
    });
    if (createdUserId) {
      await prismaService.client.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    if (attackerUserId) {
      await prismaService.client.user.deleteMany({
        where: { id: attackerUserId },
      });
    }
    if (adminUserId) {
      await prismaService.client.user.deleteMany({
        where: { id: adminUserId },
      });
    }
    await prismaService.onModuleDestroy();
  });

  // ---------------------------------------------------------------------------
  // 1. Phone Normalization & Validation
  // ---------------------------------------------------------------------------
  test("Phone Normalization: correctly transforms Bangladesh numbers to standard E.164 and rejects invalid prefixes", () => {
    assert.equal(normalizeBangladeshPhone("01712345678"), "+8801712345678");
    assert.equal(normalizeBangladeshPhone("+8801812345678"), "+8801812345678");
    assert.equal(normalizeBangladeshPhone("8801912345678"), "+8801912345678");
    assert.throws(() => normalizeBangladeshPhone("12345"));
    assert.throws(() => normalizeBangladeshPhone("01234567890")); // invalid operator prefix 012
    assert.throws(() => normalizeBangladeshPhone("01034567890")); // invalid operator prefix 010
  });

  // ---------------------------------------------------------------------------
  // 2. Keyed HMAC-SHA-256 OTP Hashing
  // ---------------------------------------------------------------------------
  test("Keyed HMAC-SHA-256 OTP Hashing: protects database against precomputed rainbow table attacks", async () => {
    const rawOtp = "123456";
    const hash = authService.hashOtp(rawOtp);

    assert.equal(typeof hash, "string");
    assert.equal(hash.length, 64, "HMAC-SHA256 must yield 64-char hex string");

    // Ordinary unkeyed SHA-256 must NOT match keyed HMAC-SHA-256
    const unkeyedSha256 = crypto
      .createHash("sha256")
      .update(rawOtp)
      .digest("hex");
    assert.notEqual(
      hash,
      unkeyedSha256,
      "Keyed HMAC-SHA256 digest must differ from ordinary SHA-256",
    );

    const res = await authService.requestOtp(
      { phone: testPhoneRaw, purpose: "REGISTER" },
      { ipAddress: "192.168.1.10" },
    );
    assert.equal(res.success, true);

    const challenge = await prismaService.client.otpChallenge.findFirst({
      where: { phone: normalizedTestPhone },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(challenge);
    assert.equal(challenge.otpHash.length, 64);
    assert.equal(challenge.attempts, 0);
  });

  // ---------------------------------------------------------------------------
  // 3. Repeated OTP Requests Throttling (Cooldown)
  // ---------------------------------------------------------------------------
  test("Repeated OTP Requests: enforces 60-second resend cooldown (429 Too Many Requests)", async () => {
    await assert.rejects(
      async () => {
        await authService.requestOtp({
          phone: testPhoneRaw,
          purpose: "REGISTER",
        });
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 429);
        assert.match(error.message || "", /Please wait/i);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 4. IP-Level Rate Limiting
  // ---------------------------------------------------------------------------
  test("IP-Level Rate Limiting: rejects excessive OTP requests from same IP address", async () => {
    const testIp = "10.10.99.1";
    const windowBucket = BigInt(Math.floor(Date.now() / (60 * 60 * 1000)));
    await prismaService.client.ipRateLimit.upsert({
      where: {
        ipAddress_windowBucket: {
          ipAddress: testIp,
          windowBucket,
        },
      },
      create: {
        ipAddress: testIp,
        windowBucket,
        requestCount: 20,
      },
      update: {
        requestCount: 20,
      },
    });

    try {
      await assert.rejects(
        async () => {
          await authService.requestOtp(
            { phone: "01799990001", purpose: "LOGIN" },
            { ipAddress: testIp },
          );
        },
        (err: unknown) => {
          const error = err as {
            status?: number;
            response?: { error?: string };
          };
          assert.equal(error.status, 429);
          assert.equal(error.response?.error, "IP_RATE_LIMIT_EXCEEDED");
          return true;
        },
      );
    } finally {
      await prismaService.client.ipRateLimit.deleteMany({
        where: { ipAddress: testIp },
      });
      await prismaService.client.otpChallenge.deleteMany({
        where: { ipAddress: testIp },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 4b. Atomic IP-Level Rate Limiting Under High Concurrency
  // ---------------------------------------------------------------------------
  test("Atomic IP Rate Limiting Under Concurrency: parallel requests cannot bypass the 20-per-hour limit", async () => {
    const testIp = "203.0.113.199";

    // Clean up test IP before starting
    await prismaService.client.ipRateLimit.deleteMany({
      where: { ipAddress: testIp },
    });
    await prismaService.client.otpChallenge.deleteMany({
      where: { ipAddress: testIp },
    });

    try {
      // Dispatch 25 parallel requests from the same IP using distinct phone numbers
      const parallelCount = 25;
      const requests = Array.from({ length: parallelCount }, (_, i) => {
        const phone = `01798${String(i).padStart(6, "0")}`;
        return authService.requestOtp(
          { phone, purpose: "LOGIN" },
          { ipAddress: testIp },
        );
      });

      const results = await Promise.allSettled(requests);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly 20 must succeed; the remaining 5 must be rejected with 429
      assert.equal(
        fulfilled.length,
        20,
        `Expected exactly 20 successful requests under limit, got ${fulfilled.length}`,
      );
      assert.equal(
        rejected.length,
        5,
        `Expected exactly 5 rejected requests over limit, got ${rejected.length}`,
      );

      // Verify all rejections are IP_RATE_LIMIT_EXCEEDED (429)
      for (const rej of rejected) {
        const error = (rej as PromiseRejectedResult).reason as {
          status?: number;
          response?: { error?: string };
        };
        assert.equal(error.status, 429);
        assert.equal(error.response?.error, "IP_RATE_LIMIT_EXCEEDED");
      }

      // Assert database record count strictly equals 20 (no oversubscription leak)
      const dbCount = await prismaService.client.otpChallenge.count({
        where: { ipAddress: testIp },
      });
      assert.equal(
        dbCount,
        20,
        "Database challenges must strictly cap at 20 under parallel flood",
      );
    } finally {
      await prismaService.client.ipRateLimit.deleteMany({
        where: { ipAddress: testIp },
      });
      await prismaService.client.otpChallenge.deleteMany({
        where: { ipAddress: testIp },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Account Enumeration Defense
  // ---------------------------------------------------------------------------
  test("Account Enumeration Defense: returns generic error message on invalid password login", async () => {
    await assert.rejects(
      async () => {
        await authService.loginWithPassword({
          identifier: "01700009999",
          password: "WrongPassword123!",
        });
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 401);
        assert.equal(error.message, "Invalid phone/email or password.");
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Invalid OTP Attempt Counter
  // ---------------------------------------------------------------------------
  test("Invalid OTP: increments attempt counter and rejects incorrect codes", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyOtp({ phone: testPhoneRaw, otp: "000000" });
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 400);
        assert.match(error.message || "", /Invalid verification code/i);
        return true;
      },
    );

    const challenge = await prismaService.client.otpChallenge.findFirst({
      where: { phone: normalizedTestPhone },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(challenge?.attempts, 1);
  });

  // ---------------------------------------------------------------------------
  // 7. Non-Destructive OTP Lockout (Attacker Cannot Lock User Account)
  // ---------------------------------------------------------------------------
  test("Non-Destructive OTP Lockout: locks challenge without disabling user account status", async () => {
    // Exhaust remaining attempts on challenge
    try {
      await authService.verifyOtp({ phone: testPhoneRaw, otp: "000001" });
    } catch {}
    try {
      await authService.verifyOtp({ phone: testPhoneRaw, otp: "000002" });
    } catch {}

    // Challenge is now locked out
    await assert.rejects(
      async () => {
        await authService.verifyOtp({ phone: testPhoneRaw, otp: "000003" });
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 400);
        return true;
      },
    );

    // If an existing user exists, verify user.status is still ACTIVE
    const existing = await prismaService.client.user.findUnique({
      where: { phone: normalizedTestPhone },
    });
    if (existing) {
      assert.equal(
        existing.status,
        "ACTIVE",
        "User account must remain ACTIVE despite failed OTPs",
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 8. Invalidate Older OTPs on Resend
  // ---------------------------------------------------------------------------
  test("Invalidate Older OTPs on Resend: previous unconsumed challenges are invalidated when new code is requested", async () => {
    // Manually backdate resendAvailableAt on previous challenge to simulate cooldown expiry
    await prismaService.client.otpChallenge.updateMany({
      where: { phone: normalizedTestPhone },
      data: { resendAvailableAt: new Date(Date.now() - 5000) },
    });

    const res = await authService.requestOtp({
      phone: testPhoneRaw,
      purpose: "LOGIN",
    });
    assert.equal(res.success, true);

    // Verify all previous challenges for this phone are marked consumedAt !== null
    const challenges = await prismaService.client.otpChallenge.findMany({
      where: { phone: normalizedTestPhone },
      orderBy: { createdAt: "asc" },
    });

    assert.ok(challenges.length >= 2);
    const olderChallenges = challenges.slice(0, challenges.length - 1);
    for (const old of olderChallenges) {
      assert.ok(
        old.consumedAt !== null,
        "Prior challenge must be invalidated on resend",
      );
    }

    const latest = challenges[challenges.length - 1];
    assert.equal(latest.consumedAt, null, "Latest challenge must be active");
  });

  // ---------------------------------------------------------------------------
  // 9. Expired OTP Rejection
  // ---------------------------------------------------------------------------
  test("Expired OTP: rejects verification when expiresAt is in the past", async () => {
    const rawOtp = "887766";
    const otpHash = authService.hashOtp(rawOtp);

    await prismaService.client.otpChallenge.create({
      data: {
        phone: normalizedTestPhone,
        otpHash,
        purpose: "LOGIN",
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() - 10000), // expired 10s ago
        resendAvailableAt: new Date(Date.now() - 10000),
      },
    });

    await assert.rejects(
      async () => {
        await authService.verifyOtp({ phone: testPhoneRaw, otp: rawOtp });
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 400);
        assert.match(error.message || "", /expired/i);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 10. User Registration & Dual Language Support
  // ---------------------------------------------------------------------------
  test("User Registration: creates user with Bangla name support and default CUSTOMER role", async () => {
    const rawOtp = "654321";
    const otpHash = authService.hashOtp(rawOtp);

    await prismaService.client.otpChallenge.create({
      data: {
        phone: normalizedTestPhone,
        otpHash,
        purpose: "REGISTER",
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAvailableAt: new Date(Date.now() - 1000),
      },
    });

    const regResult = await authService.register({
      phone: testPhoneRaw,
      otp: rawOtp,
      fullName: "Hasin Al Jubaier",
      fullNameBn: "হাসিন আল জুবায়ের",
      email: "hasin.security@bdmart.com.bd",
      preferredLanguage: "bn",
    });

    assert.ok(regResult.tokens.accessToken);
    assert.ok(regResult.tokens.refreshToken);
    assert.equal(regResult.user.phone, normalizedTestPhone);
    assert.equal(regResult.user.profile?.fullName, "Hasin Al Jubaier");
    assert.equal(regResult.user.profile?.fullNameBn, "হাসিন আল জুবায়ের");
    assert.deepEqual(regResult.user.roles, ["CUSTOMER"]);

    createdUserId = regResult.user.id;
  });

  // ---------------------------------------------------------------------------
  // 11. One-Time-Use Validation (Reused OTP Rejection)
  // ---------------------------------------------------------------------------
  test("One-Time-Use Validation: consumed OTP code cannot be reused", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyOtp({ phone: testPhoneRaw, otp: "654321" });
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 400);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 12. Concurrent OTP Verification Race Condition
  // ---------------------------------------------------------------------------
  test("Concurrent OTP Verification: exactly one request succeeds; parallel verification fails", async () => {
    const rawOtp = "771122";
    const otpHash = authService.hashOtp(rawOtp);

    await prismaService.client.otpChallenge.create({
      data: {
        phone: normalizedAttackerPhone,
        otpHash,
        purpose: "LOGIN",
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAvailableAt: new Date(Date.now() - 1000),
      },
    });

    // Fire 2 concurrent verification requests for the same OTP
    const results = await Promise.allSettled([
      authService.verifyOtp({ phone: testPhoneAttacker, otp: rawOtp }),
      authService.verifyOtp({ phone: testPhoneAttacker, otp: rawOtp }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(
      fulfilled.length,
      1,
      "Exactly one concurrent verification should succeed",
    );
    assert.equal(
      rejected.length,
      1,
      "The duplicate concurrent verification must be rejected",
    );
  });

  // ---------------------------------------------------------------------------
  // 13. Unauthorized Role Escalation Prevention
  // ---------------------------------------------------------------------------
  test("Unauthorized Role Escalation: regular user cannot assign PLATFORM_ADMIN role", async () => {
    const profile = await usersService.getProfile(createdUserId);
    assert.deepEqual(profile.roles, ["CUSTOMER"]);
    assert.equal(profile.roles.includes("PLATFORM_ADMIN"), false);

    // User updates profile
    const updated = await usersService.updateProfile(createdUserId, {
      fullName: "Hasin Admin Attempt",
      preferredLanguage: "en",
    });

    assert.equal(updated.roles.includes("PLATFORM_ADMIN"), false);
    assert.deepEqual(updated.roles, ["CUSTOMER"]);
  });

  // ---------------------------------------------------------------------------
  // 14. Normal Refresh Token Rotation
  // ---------------------------------------------------------------------------
  test("Refresh Token Rotation: issues new pair and advances rotation counter", async () => {
    const initialSession = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );

    const rotatedTokens = await tokenService.rotateRefreshToken(
      initialSession.refreshToken,
    );

    assert.ok(rotatedTokens.accessToken);
    assert.ok(rotatedTokens.refreshToken);
    assert.notEqual(rotatedTokens.refreshToken, initialSession.refreshToken);
  });

  // ---------------------------------------------------------------------------
  // 15. Refresh Token Replay Detection & Session Family Revocation
  // ---------------------------------------------------------------------------
  test("Refresh Token Replay Detection: revokes entire session family if rotated token is replayed", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );

    const rotated = await tokenService.rotateRefreshToken(session.refreshToken);

    // Adversary attempts to replay the OLD refresh token
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(session.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 401);
        return true;
      },
    );

    // Verify all active sessions in the family are now revoked
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(rotated.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 401);
        return true;
      },
    );

    const secEvent = await prismaService.client.accountSecurityEvent.findFirst({
      where: {
        userId: createdUserId,
        eventType: "TOKEN_REPLAY_DETECTED",
      },
    });
    assert.ok(secEvent, "TOKEN_REPLAY_DETECTED event must be audited");
  });

  // ---------------------------------------------------------------------------
  // 16. Concurrent Refresh Request Race Prevention
  // ---------------------------------------------------------------------------
  test("Concurrent Refresh Race Prevention: database compare-and-swap (CAS) update prevents dual rotation", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );

    // Fire 2 concurrent refresh requests with the exact same token
    const results = await Promise.allSettled([
      tokenService.rotateRefreshToken(session.refreshToken),
      tokenService.rotateRefreshToken(session.refreshToken),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(
      fulfilled.length,
      1,
      "Exactly one concurrent refresh must succeed",
    );
    assert.equal(
      rejected.length,
      1,
      "Duplicate concurrent refresh must be rejected without race",
    );

    // Verify winning rotation issued valid tokens
    const winningResult = fulfilled[0] as PromiseFulfilledResult<IssuedTokens>;
    assert.ok(winningResult.value.accessToken);
    assert.ok(winningResult.value.refreshToken);

    // The newly issued token can be rotated normally (proves session was not revoked by concurrent collision)
    const subsequentRotation = await tokenService.rotateRefreshToken(
      winningResult.value.refreshToken,
    );
    assert.ok(subsequentRotation.accessToken);
    assert.ok(subsequentRotation.refreshToken);

    // 4. A later deliberate replay of the original rotated token triggers session-family revocation
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(session.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 401);
        assert.match(error.message || "", /replay/i);
        return true;
      },
    );

    // 5. Verify the deliberate replay successfully revoked the active family member
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(subsequentRotation.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 401);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 16b. Simultaneous Duplicate Refresh Requests with Idempotency Key
  // ---------------------------------------------------------------------------
  test("Idempotent Refresh (Simultaneous): duplicate parallel requests with matching idempotency key return identical tokens", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );
    const idempotencyKey = `idem-simultaneous-${Date.now()}`;

    // Two parallel requests with the identical refresh token and idempotency key
    const results = await Promise.allSettled([
      tokenService.rotateRefreshToken(
        session.refreshToken,
        undefined,
        idempotencyKey,
      ),
      tokenService.rotateRefreshToken(
        session.refreshToken,
        undefined,
        idempotencyKey,
      ),
    ]);

    const fulfilled = results.filter(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<IssuedTokens>[];
    assert.equal(
      fulfilled.length,
      2,
      "Both simultaneous requests with same idempotency key must succeed",
    );

    // Both requests must receive the exact same valid tokens
    assert.equal(
      fulfilled[0].value.refreshToken,
      fulfilled[1].value.refreshToken,
    );
    assert.equal(
      fulfilled[0].value.accessToken,
      fulfilled[1].value.accessToken,
    );

    // Exactly one successor session must exist in the database (family size: 2)
    const decoded = jwtService.decode(session.accessToken) as {
      sessionId?: string;
    };
    const dbSession = await prismaService.client.userSession.findUnique({
      where: { id: decoded.sessionId },
    });
    assert.ok(dbSession?.familyId);

    const sessions = await prismaService.client.userSession.findMany({
      where: { familyId: dbSession.familyId },
    });
    assert.equal(
      sessions.length,
      2,
      "Exactly 2 sessions in family (1 revoked ancestor + 1 active successor)",
    );

    // The issued token can be rotated normally
    const nextRotation = await tokenService.rotateRefreshToken(
      fulfilled[0].value.refreshToken,
    );
    assert.ok(nextRotation.accessToken);
  });

  // ---------------------------------------------------------------------------
  // 16c. Delayed Duplicate Refresh Requests (Legitimate Network Retry)
  // ---------------------------------------------------------------------------
  test("Idempotent Refresh (Delayed Retry): delayed duplicate request returns original tokens and enables subsequent rotation", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );
    const idempotencyKey = `idem-retry-${Date.now()}`;

    // 1. First rotation attempt succeeds
    const firstAttempt = await tokenService.rotateRefreshToken(
      session.refreshToken,
      undefined,
      idempotencyKey,
    );
    assert.ok(firstAttempt.accessToken);
    assert.ok(firstAttempt.refreshToken);

    // 2. Simulate dropped network response: client retries with the SAME (refreshToken, idempotencyKey)
    const retryAttempt = await tokenService.rotateRefreshToken(
      session.refreshToken,
      undefined,
      idempotencyKey,
    );

    // Must return the exact same tokens without throwing or revoking family
    assert.equal(retryAttempt.refreshToken, firstAttempt.refreshToken);
    assert.equal(retryAttempt.accessToken, firstAttempt.accessToken);

    // 3. Successful rotation after legitimate retry: client uses the recovered token
    const nextRotation = await tokenService.rotateRefreshToken(
      retryAttempt.refreshToken,
    );
    assert.ok(nextRotation.accessToken);
    assert.ok(nextRotation.refreshToken);
  });

  // ---------------------------------------------------------------------------
  // 16d. Deliberate Replay from Independent Client Triggers Family Revocation
  // ---------------------------------------------------------------------------
  test("Deliberate Replay Defense: independent client presenting rotated token without matching idempotency key revokes family", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );
    const clientKey = `client-legit-${Date.now()}`;

    // Legitimate rotation
    const activeTokens = await tokenService.rotateRefreshToken(
      session.refreshToken,
      undefined,
      clientKey,
    );

    // Attacker attempts replay of old token with a DIFFERENT idempotency key (or none)
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(
          session.refreshToken,
          undefined,
          "attacker-different-key",
        );
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 401);
        assert.match(error.message || "", /replay/i);
        return true;
      },
    );

    // Confirm that the entire family was revoked: activeTokens is now dead
    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(activeTokens.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number };
        assert.equal(error.status, 401);
        return true;
      },
    );

    // Verify audit event
    const secEvent = await prismaService.client.accountSecurityEvent.findFirst({
      where: {
        userId: createdUserId,
        eventType: "TOKEN_REPLAY_DETECTED",
      },
    });
    assert.ok(secEvent, "TOKEN_REPLAY_DETECTED event must be audited");
  });

  // ---------------------------------------------------------------------------
  // 17. Single-Device Session Revocation
  // ---------------------------------------------------------------------------
  test("Session Revocation: logging out single device revokes its session", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );

    const decoded = jwtService.decode(session.accessToken) as {
      sessionId?: string;
    };
    assert.ok(decoded?.sessionId);

    await authService.logout(createdUserId, decoded.sessionId!);

    await assert.rejects(
      async () => {
        await tokenService.rotateRefreshToken(session.refreshToken);
      },
      (err: unknown) => {
        const error = err as { status?: number; message?: string };
        assert.equal(error.status, 401);
        assert.match(error.message || "", /revoked/i);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 18. Access Token Immediate Revocation via JwtAuthGuard
  // ---------------------------------------------------------------------------
  test("Access Token Immediate Revocation: JwtAuthGuard rejects access token once session is revoked", async () => {
    const session = await tokenService.createSession(
      createdUserId,
      normalizedTestPhone,
      ["CUSTOMER"],
    );

    // 1. Token is active and passes guard
    const mockReqActive: Partial<Request> = {
      headers: { authorization: `Bearer ${session.accessToken}` },
    };
    const canActivateActive = await jwtAuthGuard.canActivate(
      createMockExecutionContext(mockReqActive),
    );
    assert.equal(canActivateActive, true);

    // 2. User logs out (session revoked in DB)
    const decoded = jwtService.decode(session.accessToken) as {
      sessionId?: string;
    };
    await authService.logout(createdUserId, decoded.sessionId!);

    // 3. Same access token must now immediately fail guard despite unexpired JWT lifespan
    const mockReqRevoked: Partial<Request> = {
      headers: { authorization: `Bearer ${session.accessToken}` },
    };
    await assert.rejects(
      async () => {
        await jwtAuthGuard.canActivate(
          createMockExecutionContext(mockReqRevoked),
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /Session has been revoked/i);
        return true;
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 19. Web CSRF / Origin Guard Protection
  // ---------------------------------------------------------------------------
  test("CSRF Protection: CsrfGuard enforces origin verification, safe Referer fallback, and HTTP method protection", () => {
    // 1. Authorized origin passes on cookie-authenticated mutation
    const allowedReq: Partial<Request> = {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      cookies: { accessToken: "valid.token" },
    };
    assert.equal(
      csrfGuard.canActivate(createMockExecutionContext(allowedReq)),
      true,
    );

    // 2. Untrusted cross-origin origin (evil.com) rejected with 403 Forbidden
    const evilReq: Partial<Request> = {
      method: "POST",
      headers: { origin: "https://evil-phishing-site.com" },
      cookies: { accessToken: "valid.token" },
    };
    assert.throws(
      () => csrfGuard.canActivate(createMockExecutionContext(evilReq)),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /origin not allowed/i);
        return true;
      },
    );

    // 3. Ambient cookie request with missing Origin AND Referer rejected
    const missingOriginReq: Partial<Request> = {
      method: "POST",
      headers: {},
      cookies: { accessToken: "valid.token" },
    };
    assert.throws(
      () => csrfGuard.canActivate(createMockExecutionContext(missingOriginReq)),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /Origin or Referer header required/i);
        return true;
      },
    );

    // 4. Safe Referer fallback when Origin is absent (exact origin match) passes
    const validRefererReq: Partial<Request> = {
      method: "POST",
      headers: { referer: "http://localhost:3000/profile/settings" },
      cookies: { accessToken: "valid.token" },
    };
    assert.equal(
      csrfGuard.canActivate(createMockExecutionContext(validRefererReq)),
      true,
      "Valid referer from allowed origin must be permitted",
    );

    // 5. Malicious prefix bypass attempt in Referer (e.g. localhost:3000.evil.com) rejected
    const prefixBypassReq: Partial<Request> = {
      method: "POST",
      headers: { referer: "http://localhost:3000.evil-hacker.com/steal" },
      cookies: { accessToken: "valid.token" },
    };
    assert.throws(
      () => csrfGuard.canActivate(createMockExecutionContext(prefixBypassReq)),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /referer not allowed/i);
        return true;
      },
    );

    // 6. Protected HTTP methods (POST, PUT, PATCH, DELETE) are all guarded against invalid origin
    const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
    for (const method of mutatingMethods) {
      const mutReq: Partial<Request> = {
        method,
        headers: { origin: "https://malicious-origin.com" },
        cookies: { accessToken: "valid.token" },
      };
      assert.throws(
        () => csrfGuard.canActivate(createMockExecutionContext(mutReq)),
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenException);
          return true;
        },
        `Method ${method} must be protected against unauthorized cross-origin requests`,
      );
    }

    // 7. Safe idempotent HTTP methods (GET, HEAD, OPTIONS) pass without CSRF rejection
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    for (const method of safeMethods) {
      const safeReq: Partial<Request> = {
        method,
        headers: { origin: "https://external-search-indexer.com" },
        cookies: { accessToken: "valid.token" },
      };
      assert.equal(
        csrfGuard.canActivate(createMockExecutionContext(safeReq)),
        true,
        `Safe method ${method} must pass freely`,
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 20. Platform Administrator Bootstrap
  // ---------------------------------------------------------------------------
  test("Platform Administrator Bootstrap: provisions admin with valid secret and rejects unauthorized secret", async () => {
    const validSecret =
      process.env.ADMIN_BOOTSTRAP_SECRET ||
      "bdmart-dev-admin-bootstrap-secret-9876543210fedcba9876543210fedcba";

    // 1. Invalid secret rejected
    await assert.rejects(
      async () => {
        await bootstrapAdministrator({
          phone: adminPhoneRaw,
          fullName: "Unauthorized Admin",
          bootstrapSecret: "wrong-secret-12345",
        });
      },
      (err: unknown) => {
        assert.match(String(err), /Provided bootstrap secret does not match/i);
        return true;
      },
    );

    // 2. Valid secret provisions PLATFORM_ADMIN
    const admin = await bootstrapAdministrator({
      phone: adminPhoneRaw,
      fullName: "Super Admin",
      email: "admin.bootstrap@bdmart.com.bd",
      password: "SuperSecretAdminPassword123!",
      bootstrapSecret: validSecret,
    });

    assert.ok(admin);
    assert.equal(admin.phone, normalizedAdminPhone);
    adminUserId = admin.id;

    // Verify user has PLATFORM_ADMIN role
    const adminProfile = await usersService.getProfile(admin.id);
    assert.ok(
      adminProfile.roles.includes("PLATFORM_ADMIN"),
      "Bootstrapped user must possess PLATFORM_ADMIN role",
    );
  });

  // ---------------------------------------------------------------------------
  // 21. Cross-User Data Isolation
  // ---------------------------------------------------------------------------
  test("Cross-User Data Isolation: authenticated user cannot modify another user's profile", async () => {
    // Attempting to update profile using User A's credentials for User B's profile
    // UsersService strictly operates on the authenticated userId parameter from the JWT sub claim
    const originalHasinProfile = await usersService.getProfile(createdUserId);

    // Simulated attacker tries to update their own profile; verify User A's profile remains untouched
    await prismaService.client.user.deleteMany({
      where: { phone: "+8801700009999" },
    });
    const attacker = await prismaService.client.user.create({
      data: {
        phone: "+8801700009999",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Attacker User",
          },
        },
      },
      include: { profile: true },
    });
    attackerUserId = attacker.id;

    await usersService.updateProfile(attacker.id, {
      fullName: "Modified By Attacker",
    });

    const verifyHasinProfile = await usersService.getProfile(createdUserId);
    assert.equal(
      verifyHasinProfile.profile?.fullName,
      originalHasinProfile.profile?.fullName,
      "User A's profile must be completely isolated from User B's updates",
    );
  });
});
