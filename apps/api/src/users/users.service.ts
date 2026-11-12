import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { UpdateProfileDto, UserProfileResponse } from "@bdmart/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "../auth/auth.service.js";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Retrieves profile of current user.
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException("User profile not found.");
    }

    return this.authService.mapUserProfile(user);
  }

  /**
   * Updates profile of current user (English name, Bangla name, language, avatar, gender).
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException("User not found.");
    }

    const updatedProfile = await this.prisma.client.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: dto.fullName || "User",
        fullNameBn: dto.fullNameBn || null,
        preferredLanguage: dto.preferredLanguage || "bn",
        avatarUrl: dto.avatarUrl || null,
        gender: dto.gender || null,
      },
      update: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.fullNameBn !== undefined && { fullNameBn: dto.fullNameBn }),
        ...(dto.preferredLanguage !== undefined && {
          preferredLanguage: dto.preferredLanguage,
        }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
      },
    });

    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId,
        eventType: "PROFILE_UPDATED",
        metadata: JSON.stringify(dto),
      },
    });

    return this.getProfile(userId);
  }

  /**
   * Deactivates the user account and revokes all active sessions.
   */
  async deactivateAccount(
    userId: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { status: "DEACTIVATED" },
    });

    // Revoke all active sessions
    await this.prisma.client.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId,
        eventType: "ACCOUNT_DEACTIVATED",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: "Self-service account deactivation",
      },
    });

    return { message: "Account deactivated successfully." };
  }

  /**
   * Submits an account deletion request, scheduling soft deletion and revoking sessions.
   */
  async requestAccountDeletion(
    userId: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const now = new Date();
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        status: "DEACTIVATED",
      },
    });

    // Revoke all active sessions
    await this.prisma.client.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await this.prisma.client.accountSecurityEvent.create({
      data: {
        userId,
        eventType: "ACCOUNT_DELETION_REQUESTED",
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
        metadata: `Deletion requested at ${now.toISOString()}`,
      },
    });

    return {
      message:
        "Account deletion request submitted. Your data has been scheduled for permanent removal.",
    };
  }

  /**
   * Administrative User Listing with pagination and role filtering.
   */
  async listUsersForAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: users.map((u) => this.authService.mapUserProfile(u)),
    };
  }
}
