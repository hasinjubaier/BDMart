import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  RegisterUserSchema,
  PasswordLoginSchema,
  RefreshTokenSchema,
  RequestOtpDto,
  VerifyOtpDto,
  RegisterUserDto,
  PasswordLoginDto,
  RefreshTokenDto,
} from "@bdmart/contracts";
import { AuthService } from "./auth.service.js";
import { Public } from "./decorators/public.decorator.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { TokenPayload } from "./services/token.service.js";

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getClientInfo(req: Request) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "";
    const userAgent = req.headers["user-agent"] || "";
    return { ipAddress, userAgent };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === "production";

    // Set Access Token cookie (short-lived, 15m)
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    // Set Refresh Token cookie (7 days)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });
  }

  /**
   * Request OTP verification code for Bangladesh phone number.
   */
  @Public()
  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() rawBody: unknown, @Req() req: Request) {
    const dto = RequestOtpSchema.parse(rawBody) as RequestOtpDto;
    const clientInfo = this.getClientInfo(req);
    return this.authService.requestOtp(dto, clientInfo);
  }

  /**
   * Verify OTP code; logs in existing user or instructs to complete registration.
   */
  @Public()
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() rawBody: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dto = VerifyOtpSchema.parse(rawBody) as VerifyOtpDto;
    const clientInfo = this.getClientInfo(req);
    const result = await this.authService.verifyOtp(dto, clientInfo);

    if (result.tokens) {
      this.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
    }

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Register a new user with verified phone number and basic profile.
   */
  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() rawBody: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dto = RegisterUserSchema.parse(rawBody) as RegisterUserDto;
    const clientInfo = this.getClientInfo(req);
    const result = await this.authService.register(dto, clientInfo);

    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    return {
      success: true,
      data: {
        tokens: result.tokens,
        user: result.user,
      },
      message: "Account registered successfully.",
    };
  }

  /**
   * Password login for administrative / staff accounts.
   */
  @Public()
  @Post("login/password")
  @HttpCode(HttpStatus.OK)
  async loginPassword(
    @Body() rawBody: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dto = PasswordLoginSchema.parse(rawBody) as PasswordLoginDto;
    const clientInfo = this.getClientInfo(req);
    const result = await this.authService.loginWithPassword(dto, clientInfo);

    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    return {
      success: true,
      data: {
        tokens: result.tokens,
        user: result.user,
      },
      message: "Login successful.",
    };
  }

  /**
   * Refresh access tokens with refresh token rotation and replay protection.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() rawBody: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Check request body first, then fallback to HttpOnly cookie
    let rawToken: string | undefined;

    if (rawBody && typeof rawBody === "object" && "refreshToken" in rawBody) {
      const parsed = RefreshTokenSchema.safeParse(rawBody);
      if (parsed.success) {
        rawToken = parsed.data.refreshToken;
      }
    }

    if (!rawToken && req.cookies && req.cookies.refreshToken) {
      rawToken = req.cookies.refreshToken;
    }

    if (!rawToken) {
      throw new UnauthorizedException("Refresh token required.");
    }

    const clientInfo = this.getClientInfo(req);
    const idempotencyKey =
      (req.headers["x-idempotency-key"] as string) ||
      (rawBody && typeof rawBody === "object" && "idempotencyKey" in rawBody
        ? String((rawBody as { idempotencyKey?: unknown }).idempotencyKey)
        : undefined);

    const newTokens = await this.authService.refreshTokens(
      rawToken,
      clientInfo,
      idempotencyKey,
    );

    this.setAuthCookies(res, newTokens.accessToken, newTokens.refreshToken);

    return {
      success: true,
      data: newTokens,
    };
  }

  /**
   * Logout from current device (revokes current session).
   */
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: TokenPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientInfo = this.getClientInfo(req);
    await this.authService.logout(user.sub, user.sessionId, clientInfo);
    this.clearAuthCookies(res);

    return {
      success: true,
      message: "Logged out successfully.",
    };
  }

  /**
   * Logout from all devices (revokes all active user sessions).
   */
  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: TokenPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientInfo = this.getClientInfo(req);
    await this.authService.logoutAll(user.sub, clientInfo);
    this.clearAuthCookies(res);

    return {
      success: true,
      message: "Logged out from all devices.",
    };
  }

  /**
   * Get current authenticated user session details.
   */
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: TokenPayload) {
    return {
      success: true,
      data: user,
    };
  }
}
