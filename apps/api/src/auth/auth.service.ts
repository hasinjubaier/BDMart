import crypto from "node:crypto";
import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import bcryptjs from "bcryptjs";
import { normalizeBangladeshPhone } from "@bdmart/utils";
import {
  RequestOtpDto,
  VerifyOtpDto,
  RegisterUserDto,
  PasswordLoginDto,
  UserProfileResponse,
} from "@bdmart/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { SmsService } from "./services/sms.service.js";
import { TokenService, IssuedTokens } from "./services/token.service.js";

export interface UserWithRelations {
  id: string;
  phone: string;
  email: string | null;
  status: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  passwordHash?: string | null;
  deletedAt?: Date | null;
  profile?: {
    fullName: string;
    fullNameBn?: string | null;
    avatarUrl?: string | null;
    preferredLanguage: string;
    gender?: string | null;
  } | null;
  userRoles?: Array<{
    role?: {
      code: string;
    };
    roleId?: string;
  }>;
}

export interface VerifyOtpResult {
  isNewUser: boolean;
  phone: string;
  tokens?: IssuedTokens;
  user?: UserProfileResponse;
  message?: string;
}

export interface RegisterResult {
  tokens: IssuedTokens;
  user: UserProfileResponse;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpSecret: string;
  private readonly otpExpiryMinutes = 5;
  private readonly resendCooldownSeconds = 60;
  private readonly maxAttempts = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly tokenService: TokenService,
  ) {
    const configuredOtpSecret = process.env.OTP_HASH_SECRET;
    if (!configuredOtpSecret || configuredOtpSecret.length < 32) {
      throw new Error(
        "FATAL: OTP_HASH_SECRET environment variable is missing or insufficiently strong (minimum 32 characters required).",
      );
    }
    this.otpSecret = configuredOtpSecret;
  }

  /**
   * Hashes a 6-digit OTP using HMAC-SHA256 for secure database storage.
   */
  public hashOtp(otp: string): string {
    return crypto
      .createHmac("sha256", this.otpSecret)
      .update(otp)
      .digest("hex");
  }

  /**
   * Maps a Prisma user model with profile and roles to a UserProfileResponse.
   */
  public mapUserProfile(user: UserWithRelations): UserProfileResponse {
    const roles = Array.isArray(user.userRoles)
      ? user.userRoles.map((ur) => ur.role?.code || ur.roleId || "")
      : [];

    return {
      id: user.id,
      phone: user.phone,
      email: user.email || null,
      status: user.status,
      isPhoneVerified: Boolean(user.isPhoneVerified),
      isEmailVerified: Boolean(user.isEmailVerified),
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            fullNameBn: user.profile.fullNameBn || null,
            avatarUrl: user.profile.avatarUrl || null,
            preferredLanguage: user.profile.preferredLanguage || "bn",
            gender: user.profile.gender || null,
          }
        : null,
      roles,
    };
  }

  /**
   * Requests a new phone OTP challenge.
   */
  async requestOtp(
    dto: RequestOtpDto,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedPhone = normalizeBangladeshPhone(dto.phone);
    const purpose = dto.purpose || "LOGIN";
    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 1. IP-Level Rate Limit Check: Atomic PostgreSQL UPSERT counter (max 20 requests per hour per IP)
    if (clientInfo?.ipAddress) {
      const windowBucket = BigInt(Math.floor(Date.now() / (60 * 60 * 1000)));
      const [row] = await this.prisma.client.$queryRaw<
        Array<{ request_count: number }>
      >`
        INSERT INTO "ip_rate_limits" ("ip_address", "window_bucket", "request_count", "updated_at")
        VALUES (${clientInfo.ipAddress}, ${windowBucket}, 1, NOW())
        ON CONFLICT ("ip_address", "window_bucket")
        DO UPDATE SET "request_count" = "ip_rate_limits"."request_count" + 1, "updated_at" = NOW()
        RETURNING "request_count";
      `;

      if (row && Number(row.request_count) > 20) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: "IP_RATE_LIMIT_EXCEEDED",
            message:
              "Too many OTP requests from this network. Please wait an hour before trying again.",
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Cooldown Check: Ensure user cannot flood requests within resendCooldownSeconds
    const activeCooldown = await this.prisma.client.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        consumedAt: null,
        resendAvailableAt: {
          gt: now,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeCooldown) {
      const waitSeconds = Math.max(
        1,
        Math.ceil(
          (activeCooldown.resendAvailableAt.getTime() - now.getTime()) / 1000,
        ),
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "TOO_MANY_REQUESTS",
          message: `Please wait ${waitSeconds}s before requesting a new OTP code.`,
          cooldownSeconds: waitSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Hourly Rate Limit Check: max 10 requests per hour per phone
    const recentRequestsCount = await this.prisma.client.otpChallenge.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequestsCount >= 10) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many OTP requests. Please wait one hour before trying again.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Invalidate any older unconsumed OTP challenges for this phone number
    await this.prisma.client.otpChallenge.updateMany({
      where: {
        phone: normalizedPhone,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    // 5. Generate cryptographically secure 6-digit numeric OTP [100000, 1000000)
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);

    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
    const resendAvailableAt = new Date(
      Date.now() + this.resendCooldownSeconds * 1000,
    );

    // 6. Record OTP challenge with hash in database
    await this.prisma.client.otpChallenge.create({
      data: {
        phone: normalizedPhone,
        otpHash,
        purpose,
        attempts: 0,
        maxAttempts: this.maxAttempts,
        expiresAt,
        resendAvailableAt,
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
      },
    });

    // 3. Dispatch via SMS provider interface (after atomic database commit)
    await this.smsService.sendOtp(normalizedPhone, rawOtp, purpose);

    // 4. Record security audit event
    await this.prisma.client.accountSecurityEvent.create({
      data: {
        eventType: "OTP_REQUESTED",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: JSON.stringify({ phone: normalizedPhone, purpose }),
      },
    });

    return {
      success: true,
      message: "Verification code sent successfully.",
      cooldownSeconds: this.resendCooldownSeconds,
      expiresInSeconds: this.otpExpiryMinutes * 60,
    };
  }

  /**
   * Verifies an OTP challenge and logs in existing user or directs to registration.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<VerifyOtpResult> {
    const normalizedPhone = normalizeBangladeshPhone(dto.phone);
    const now = new Date();

    // 1. Retrieve latest unconsumed challenge
    const challenge = await this.prisma.client.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      throw new BadRequestException(
        "No active OTP request found. Please request a new code.",
      );
    }

    // 2. Expiration check
    if (challenge.expiresAt < now) {
      throw new BadRequestException(
        "Verification code has expired. Please request a new code.",
      );
    }

    // 3. Maximum attempts check
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException(
        "Maximum verification attempts exceeded. Please request a new code.",
      );
    }

    // 4. Secure Hash Comparison
    const candidateHash = this.hashOtp(dto.otp);
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(challenge.otpHash, "hex");
    const isMatch =
      candidateBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(candidateBuffer, storedBuffer);

    if (!isMatch) {
      const updatedAttempts = challenge.attempts + 1;
      const remainingAttempts = Math.max(
        0,
        challenge.maxAttempts - updatedAttempts,
      );

      await this.prisma.client.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: updatedAttempts },
      });

      await this.prisma.client.accountSecurityEvent.create({
        data: {
          eventType: "OTP_FAILED",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: JSON.stringify({
            phone: normalizedPhone,
            remainingAttempts,
          }),
        },
      });

      throw new BadRequestException(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts reached. Please request a new code.",
      );
    }

    // 5. Mark challenge as consumed (One-time-use validation)
    await this.prisma.client.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: now },
    });

    await this.prisma.client.accountSecurityEvent.create({
      data: {
        eventType: "OTP_VERIFIED",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: JSON.stringify({ phone: normalizedPhone }),
      },
    });

    // 6. Check if user already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (existingUser) {
      // Check account status
      if (existingUser.status === "SUSPENDED" || existingUser.deletedAt) {
        throw new UnauthorizedException("Account is suspended or deactivated.");
      }

      // Mark phone verified if not yet set
      if (!existingUser.isPhoneVerified) {
        await this.prisma.client.user.update({
          where: { id: existingUser.id },
          data: { isPhoneVerified: true },
        });
      }

      const roles = existingUser.userRoles.map((ur) => ur.role.code);
      const tokens = await this.tokenService.createSession(
        existingUser.id,
        existingUser.phone,
        roles,
        clientInfo,
      );

      await this.prisma.client.accountSecurityEvent.create({
        data: {
          userId: existingUser.id,
          eventType: "LOGIN_SUCCESS",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: "Phone OTP Login",
        },
      });

      return {
        isNewUser: false,
        phone: normalizedPhone,
        tokens,
        user: this.mapUserProfile(existingUser),
      };
    }

    // New user detected: instruct client to complete registration
    return {
      isNewUser: true,
      phone: normalizedPhone,
      message: "Phone number verified. Please complete your registration.",
    };
  }

  /**
   * Registers a new user following successful phone verification.
   */
  async register(
    dto: RegisterUserDto,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<RegisterResult> {
    const normalizedPhone = normalizeBangladeshPhone(dto.phone);

    // 1. Verify that the provided OTP is valid for this registration
    const candidateHash = this.hashOtp(dto.otp);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const matchingChallenge = await this.prisma.client.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        otpHash: candidateHash,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!matchingChallenge) {
      throw new BadRequestException(
        "Invalid verification code for registration.",
      );
    }

    if (matchingChallenge.consumedAt) {
      // If already verified/consumed, verify it was verified within the 15-minute registration window
      if (matchingChallenge.consumedAt < fifteenMinutesAgo) {
        throw new BadRequestException(
          "Verification code has expired. Please request a new code.",
        );
      }
    } else {
      // If still pending, verify and consume it now
      await this.verifyOtp(
        { phone: normalizedPhone, otp: dto.otp },
        clientInfo,
      );
    }

    // 2. Ensure phone is not already registered
    const existingPhone = await this.prisma.client.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new ConflictException("Phone number is already registered.");
    }

    // 3. Ensure email (if provided) is not already registered
    const email = dto.email ? dto.email.toLowerCase().trim() : null;
    if (email) {
      const existingEmail = await this.prisma.client.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException("Email address is already registered.");
      }
    }

    // 4. Ensure default CUSTOMER role exists
    const customerRole = await this.prisma.client.role.upsert({
      where: { code: "CUSTOMER" },
      update: {},
      create: {
        code: "CUSTOMER",
        name: "Customer",
        description: "Registered marketplace retail and wholesale customer",
      },
    });

    // 5. Create user and profile in atomic transaction
    const newUser = await this.prisma.client.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: normalizedPhone,
          email,
          status: "ACTIVE",
          isPhoneVerified: true,
          isEmailVerified: false,
          profile: {
            create: {
              fullName: dto.fullName,
              fullNameBn: dto.fullNameBn || null,
              preferredLanguage: dto.preferredLanguage || "bn",
            },
          },
          userRoles: {
            create: {
              roleId: customerRole.id,
              scopeType: "PLATFORM",
            },
          },
        },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      await tx.accountSecurityEvent.create({
        data: {
          userId: user.id,
          eventType: "ACCOUNT_REGISTERED",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: JSON.stringify({
            phone: normalizedPhone,
            role: "CUSTOMER",
          }),
        },
      });

      return user;
    });

    // 6. Issue initial session and tokens
    const roles = newUser.userRoles.map((ur) => ur.role.code);
    const tokens = await this.tokenService.createSession(
      newUser.id,
      newUser.phone,
      roles,
      clientInfo,
    );

    return {
      tokens,
      user: this.mapUserProfile(newUser),
    };
  }

  /**
   * Password login for staff / administrative users or accounts with password credentials.
   */
  async loginWithPassword(
    dto: PasswordLoginDto,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<RegisterResult> {
    const rawIdentifier = dto.identifier.trim();
    const isPhone = /^(?:\+?880|0)?1[3-9]\d{8}$/.test(rawIdentifier);

    let user: UserWithRelations | null = null;
    if (isPhone) {
      const normalizedPhone = normalizeBangladeshPhone(rawIdentifier);
      user = await this.prisma.client.user.findUnique({
        where: { phone: normalizedPhone },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    } else {
      user = await this.prisma.client.user.findUnique({
        where: { email: rawIdentifier.toLowerCase() },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid phone/email or password.");
    }

    if (user.status !== "ACTIVE" || user.deletedAt) {
      throw new UnauthorizedException("Account is suspended or deactivated.");
    }

    const isMatch = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.prisma.client.accountSecurityEvent.create({
        data: {
          userId: user.id,
          eventType: "LOGIN_FAILED",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: "Password comparison mismatch",
        },
      });
      throw new UnauthorizedException("Invalid phone/email or password.");
    }

    const roles = user.userRoles
      ? user.userRoles.map((ur) => ur.role?.code || ur.roleId || "")
      : [];
    const tokens = await this.tokenService.createSession(
      user.id,
      user.phone,
      roles,
      clientInfo,
    );

    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId: user.id,
        eventType: "LOGIN_SUCCESS",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: "Password Login",
      },
    });

    return {
      tokens,
      user: this.mapUserProfile(user),
    };
  }

  /**
   * Refreshes access tokens using refresh token rotation with optional idempotency-key retry recovery.
   */
  async refreshTokens(
    refreshToken: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
    idempotencyKey?: string,
  ): Promise<IssuedTokens> {
    return this.tokenService.rotateRefreshToken(
      refreshToken,
      clientInfo,
      idempotencyKey,
    );
  }

  /**
   * Revokes current session (single device logout).
   */
  async logout(
    userId: string,
    sessionId: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.tokenService.revokeSession(sessionId);
    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId,
        eventType: "LOGOUT",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: `Session ${sessionId} revoked`,
      },
    });
  }

  /**
   * Revokes all sessions for user (all devices logout).
   */
  async logoutAll(
    userId: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.tokenService.revokeAllUserSessions(userId);
    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId,
        eventType: "LOGOUT_ALL",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: "All sessions revoked",
      },
    });
  }
}
