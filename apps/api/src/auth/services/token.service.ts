import crypto from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service.js";

export interface TokenPayload {
  sub: string; // userId
  phone: string;
  roles: string[];
  sessionId: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpirySeconds = 15 * 60; // 15 minutes
  private readonly refreshTokenExpiryDays = 7; // 7 days

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates a cryptographically secure random refresh token.
   */
  private generateRawRefreshToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hashes a raw refresh token using SHA-256 for secure database storage.
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Cryptographic key derivation for token payload encryption (AES-256-GCM).
   */
  private getEncryptionKey(): Buffer {
    const secret =
      process.env.JWT_SECRET ||
      process.env.OTP_HASH_SECRET ||
      "bdmart-dev-token-encryption-key-32-byte-hex";
    return crypto.createHash("sha256").update(secret).digest();
  }

  /**
   * Encrypts issued tokens using AES-256-GCM for secure rotation recovery.
   */
  private encryptTokenPayload(payload: IssuedTokens): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.getEncryptionKey(),
      iv,
    );
    const plaintext = JSON.stringify(payload);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  /**
   * Decrypts an encrypted token payload. Returns null if invalid or tampered.
   */
  private decryptTokenPayload(encryptedString: string): IssuedTokens | null {
    try {
      const parts = encryptedString.split(":");
      if (parts.length !== 3) return null;
      const [ivB64, tagB64, dataB64] = parts;
      const iv = Buffer.from(ivB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const data = Buffer.from(dataB64, "base64");
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        this.getEncryptionKey(),
        iv,
      );
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString("utf8")) as IssuedTokens;
    } catch {
      return null;
    }
  }

  /**
   * Creates a new user session and issues initial access and refresh tokens.
   */
  async createSession(
    userId: string,
    phone: string,
    roles: string[],
    clientInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const rawRefreshToken = this.generateRawRefreshToken();
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.client.userSession.create({
      data: {
        userId,
        familyId,
        refreshTokenHash,
        rotationCounter: 1,
        userAgent: clientInfo?.userAgent || null,
        ipAddress: clientInfo?.ipAddress || null,
        expiresAt,
      },
    });

    const accessToken = await this.generateAccessToken({
      sub: userId,
      phone,
      roles,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresInSeconds: this.accessTokenExpirySeconds,
    };
  }

  /**
   * Generates an access token with embedded user claims.
   */
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        phone: payload.phone,
        roles: payload.roles,
        sessionId: payload.sessionId,
      },
      {
        expiresIn: this.accessTokenExpirySeconds,
      },
    );
  }

  /**
   * Rotates a refresh token using session-family token chaining, atomic database transactions,
   * conditional updates, replay attack detection, and optional idempotency-key retry recovery.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    clientInfo?: { userAgent?: string; ipAddress?: string },
    idempotencyKey?: string,
  ): Promise<IssuedTokens> {
    const candidateHash = this.hashToken(rawRefreshToken);
    const idempotencyHash = idempotencyKey
      ? crypto.createHash("sha256").update(idempotencyKey).digest("hex")
      : null;

    // 1. Look for session with matching hash
    const session = await this.prisma.client.userSession.findFirst({
      where: {
        refreshTokenHash: candidateHash,
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      this.logger.warn("Refresh token hash not recognized.");
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    // 2. REPLAY DETECTION & IDEMPOTENT RETRY DIFFERENTIATION:
    // If a session with this token is already revoked, inspect whether this is a legitimate matching retry.
    if (session.isRevoked) {
      const retryWindowMs = 60 * 1000; // 60-second retry leeway for dropped responses
      const isWithinWindow =
        Date.now() - session.updatedAt.getTime() < retryWindowMs;

      if (
        idempotencyHash &&
        session.idempotencyHash &&
        idempotencyHash.length === session.idempotencyHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(idempotencyHash, "hex"),
          Buffer.from(session.idempotencyHash, "hex"),
        ) &&
        isWithinWindow &&
        session.encryptedTokenCache
      ) {
        // Verify successor session in family is still active (has not been subsequently rotated or revoked)
        const activeSuccessor = await this.prisma.client.userSession.findFirst({
          where: {
            familyId: session.familyId,
            rotationCounter: session.rotationCounter + 1,
            isRevoked: false,
          },
        });

        if (activeSuccessor) {
          const cachedTokens = this.decryptTokenPayload(
            session.encryptedTokenCache,
          );
          if (cachedTokens) {
            this.logger.log(
              `[IDEMPOTENT RETRY] Legitimate duplicate refresh detected for session ${session.id} with matching idempotency key. Safely returning original tokens.`,
            );
            return cachedTokens;
          }
        }
      }

      // If not an authentic matching retry, this is a CONFIRMED REPLAY ATTACK!
      this.logger.warn(
        `[SECURITY ALERT] Refresh token replay detected on session ${session.id} (family ${session.familyId}). Revoking entire family!`,
      );

      // Immediately invalidate all active sessions in the family chain in database
      await this.prisma.client.userSession.updateMany({
        where: { familyId: session.familyId },
        data: { isRevoked: true },
      });

      // Audit security event
      await this.prisma.client.accountSecurityEvent.create({
        data: {
          userId: session.userId,
          eventType: "TOKEN_REPLAY_DETECTED",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: `Replay detected for family ${session.familyId} on session ${session.id}`,
        },
      });

      throw new UnauthorizedException(
        "Token replay detected. All active sessions have been revoked for your security.",
      );
    }

    // 3. Expiration check
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Refresh token has expired. Please log in again.",
      );
    }

    // 4. User status check
    if (session.user.status !== "ACTIVE" || session.user.deletedAt) {
      throw new UnauthorizedException("User account is inactive or suspended.");
    }

    // 5. Atomic compare-and-swap (CAS) conditional update & session rotation inside transaction
    return this.prisma.client.$transaction(async (tx) => {
      // Concurrency lock: atomically set isRevoked = true ONLY IF id, isRevoked=false, AND refreshTokenHash all match
      const updateResult = await tx.userSession.updateMany({
        where: {
          id: session.id,
          isRevoked: false,
          refreshTokenHash: candidateHash,
        },
        data: {
          isRevoked: true,
          idempotencyHash: idempotencyHash || null,
        },
      });

      if (updateResult.count === 0) {
        // If simultaneous duplicate request arrived with matching idempotencyKey:
        if (idempotencyHash) {
          const updatedSession = await tx.userSession.findUnique({
            where: { id: session.id },
          });
          if (
            updatedSession?.idempotencyHash &&
            idempotencyHash.length === updatedSession.idempotencyHash.length &&
            crypto.timingSafeEqual(
              Buffer.from(idempotencyHash, "hex"),
              Buffer.from(updatedSession.idempotencyHash, "hex"),
            ) &&
            updatedSession.encryptedTokenCache
          ) {
            const cachedTokens = this.decryptTokenPayload(
              updatedSession.encryptedTokenCache,
            );
            if (cachedTokens) {
              return cachedTokens;
            }
          }
        }

        throw new UnauthorizedException(
          "Concurrent token rotation detected. Please authenticate with your latest active session.",
        );
      }

      // Create the next active session in the same family
      const nextRawRefreshToken = this.generateRawRefreshToken();
      const nextRefreshTokenHash = this.hashToken(nextRawRefreshToken);
      const nextExpiresAt = new Date(
        Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
      );

      const nextSession = await tx.userSession.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: nextRefreshTokenHash,
          rotationCounter: session.rotationCounter + 1,
          userAgent: clientInfo?.userAgent || session.userAgent,
          ipAddress: clientInfo?.ipAddress || session.ipAddress,
          expiresAt: nextExpiresAt,
        },
      });

      const userRoles = session.user.userRoles.map((ur) => ur.role.code);

      const accessToken = await this.generateAccessToken({
        sub: session.userId,
        phone: session.user.phone,
        roles: userRoles,
        sessionId: nextSession.id,
      });

      const tokens: IssuedTokens = {
        accessToken,
        refreshToken: nextRawRefreshToken,
        expiresInSeconds: this.accessTokenExpirySeconds,
      };

      // Store encryptedTokenCache on revoked session if idempotencyKey was provided
      if (idempotencyHash) {
        const encryptedCache = this.encryptTokenPayload(tokens);
        await tx.userSession.update({
          where: { id: session.id },
          data: {
            encryptedTokenCache: encryptedCache,
          },
        });
      }

      // Record rotation audit event
      await tx.accountSecurityEvent.create({
        data: {
          userId: session.userId,
          eventType: "TOKEN_ROTATED",
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: `Session rotated from ${session.id} to ${nextSession.id} (counter ${nextSession.rotationCounter})`,
        },
      });

      return tokens;
    });
  }

  /**
   * Revokes a single device session (logout).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.client.userSession.updateMany({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  /**
   * Revokes all active sessions for a user (logout all devices).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.client.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
}
