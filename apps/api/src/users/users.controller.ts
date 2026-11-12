import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { UpdateProfileSchema, UpdateProfileDto } from "@bdmart/contracts";
import { UsersService } from "./users.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { TokenPayload } from "../auth/services/token.service.js";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("v1/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getClientInfo(req: Request) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "";
    const userAgent = req.headers["user-agent"] || "";
    return { ipAddress, userAgent };
  }

  /**
   * Get current authenticated user profile.
   */
  @Get("me")
  async getMyProfile(@CurrentUser() user: TokenPayload) {
    const profile = await this.usersService.getProfile(user.sub);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * Update profile information (English and Bangla name, language, avatar, gender).
   */
  @Patch("me")
  async updateMyProfile(
    @CurrentUser() user: TokenPayload,
    @Body() rawBody: unknown,
  ) {
    const dto = UpdateProfileSchema.parse(rawBody) as UpdateProfileDto;
    const updated = await this.usersService.updateProfile(user.sub, dto);
    return {
      success: true,
      data: updated,
      message: "Profile updated successfully.",
    };
  }

  /**
   * Deactivate account and revoke all sessions.
   */
  @Post("me/deactivate")
  async deactivateMyAccount(
    @CurrentUser() user: TokenPayload,
    @Req() req: Request,
  ) {
    const clientInfo = this.getClientInfo(req);
    const result = await this.usersService.deactivateAccount(
      user.sub,
      clientInfo,
    );
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Request account deletion (scheduled soft delete).
   */
  @Post("me/delete-request")
  async requestDeletion(
    @CurrentUser() user: TokenPayload,
    @Req() req: Request,
  ) {
    const clientInfo = this.getClientInfo(req);
    const result = await this.usersService.requestAccountDeletion(
      user.sub,
      clientInfo,
    );
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Platform Administrator / Support Operator user listing.
   * Strictly guarded by RolesGuard; regular CUSTOMER users cannot access.
   */
  @Roles("PLATFORM_ADMIN", "SUPPORT_OPERATOR")
  @Get("admin/list")
  async listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const result = await this.usersService.listUsersForAdmin(
      parsedPage,
      parsedLimit,
    );
    return {
      success: true,
      ...result,
    };
  }
}
