import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient, createPrismaClient } from "@bdmart/database";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public client!: PrismaClient;

  onModuleInit() {
    try {
      this.client = createPrismaClient({
        logQueries: process.env.NODE_ENV === "development",
      });
      this.logger.log(
        "PrismaService initialized with Neon serverless driver adapter.",
      );
    } catch (error) {
      this.logger.warn(
        `PrismaService initialization deferred: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
      this.logger.log("PrismaService disconnected.");
    }
  }
}
