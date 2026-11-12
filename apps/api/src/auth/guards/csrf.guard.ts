import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly allowedOrigins: string[];

  constructor(private readonly reflector: Reflector) {
    const corsEnv = process.env.CORS_ORIGINS;
    this.allowedOrigins = corsEnv
      ? corsEnv.split(",").map((o) => o.trim().toLowerCase())
      : ["http://localhost:3000", "http://localhost:8081"];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe / idempotent methods (GET, HEAD, OPTIONS) do not alter server state
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return true;
    }

    const origin = (request.headers.origin || "").toLowerCase().trim();
    const referer = (request.headers.referer || "").toLowerCase().trim();

    // Check if the request carries ambient cookie authentication
    const hasAuthCookie = Boolean(
      request.cookies &&
      (request.cookies.accessToken || request.cookies.refreshToken),
    );

    // If request is authenticated via ambient cookies, strictly require valid Origin or Referer
    if (hasAuthCookie) {
      if (!origin && !referer) {
        this.logger.warn(
          `CSRF blocked: Cookie-authenticated ${method} request missing Origin and Referer headers`,
        );
        throw new ForbiddenException(
          "CSRF protection: Origin or Referer header required for cookie-authenticated requests.",
        );
      }

      if (origin) {
        const isAllowedOrigin = this.allowedOrigins.some(
          (allowed) => origin === allowed || allowed === "*",
        );
        if (!isAllowedOrigin) {
          this.logger.warn(
            `CSRF blocked: Origin "${origin}" is not in allowed origins list (${this.allowedOrigins.join(", ")})`,
          );
          throw new ForbiddenException(
            "CSRF protection: Request origin not allowed.",
          );
        }
      } else if (referer) {
        let refererOrigin: string | null = null;
        try {
          refererOrigin = new URL(referer).origin.toLowerCase();
        } catch {
          refererOrigin = null;
        }

        const isAllowedReferer = Boolean(
          refererOrigin &&
          this.allowedOrigins.some(
            (allowed) => refererOrigin === allowed || allowed === "*",
          ),
        );
        if (!isAllowedReferer) {
          this.logger.warn(
            `CSRF blocked: Referer "${referer}" (origin: "${refererOrigin}") does not match allowed origins (${this.allowedOrigins.join(", ")})`,
          );
          throw new ForbiddenException(
            "CSRF protection: Request referer not allowed.",
          );
        }
      }
    } else if (origin) {
      // For unauthenticated or Bearer-authenticated requests with an explicit Origin header,
      // verify origin if present to protect public mutating endpoints against cross-origin abuse
      const isAllowedOrigin = this.allowedOrigins.some(
        (allowed) => origin === allowed || allowed === "*",
      );
      if (!isAllowedOrigin) {
        this.logger.warn(
          `CSRF blocked: Untrusted cross-origin request from "${origin}"`,
        );
        throw new ForbiddenException(
          "CSRF protection: Request origin not allowed.",
        );
      }
    }

    return true;
  }
}
