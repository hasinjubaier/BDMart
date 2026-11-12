import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { TokenPayload } from "../services/token.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token required.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);

      // Verify active session state in database to support immediate access token revocation
      if (payload.sessionId) {
        const session = await this.prisma.client.userSession.findUnique({
          where: { id: payload.sessionId },
          include: {
            user: {
              select: { status: true, deletedAt: true },
            },
          },
        });

        if (!session || session.isRevoked) {
          throw new UnauthorizedException(
            "Session has been revoked. Please authenticate again.",
          );
        }

        if (session.expiresAt < new Date()) {
          throw new UnauthorizedException(
            "Session has expired. Please authenticate again.",
          );
        }

        if (session.user.status !== "ACTIVE" || session.user.deletedAt) {
          throw new UnauthorizedException(
            "User account is inactive or suspended.",
          );
        }
      }

      (request as Request & { user?: TokenPayload }).user = payload;
      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        "Invalid or expired authentication token.",
      );
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    // 1. Check Authorization Bearer header
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === "string") {
      const [type, token] = authHeader.split(" ");
      if (type === "Bearer" && token) {
        return token;
      }
    }

    // 2. Check HttpOnly cookie (accessToken)
    if (
      request.cookies &&
      (request.cookies as Record<string, string>).accessToken
    ) {
      return (request.cookies as Record<string, string>).accessToken;
    }

    return null;
  }
}
