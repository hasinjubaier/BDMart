import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SmsService } from "./services/sms.service.js";
import { TokenService } from "./services/token.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RolesGuard } from "./guards/roles.guard.js";
import { CsrfGuard } from "./guards/csrf.guard.js";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "bdmart-super-secret-jwt-key-2026",
        signOptions: {
          expiresIn: "15m",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SmsService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
    JwtModule,
  ],
})
export class AuthModule {}
