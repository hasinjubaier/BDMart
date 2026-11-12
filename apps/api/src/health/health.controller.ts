import { Controller, Get, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

interface DbDiagnosticsRow {
  connected: number;
  database_name: string;
  database_role: string;
  server_time: Date;
}

@Controller("v1/health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let dbStatus = "DISCONNECTED";
    let querySuccess = false;
    let latencyMs: number | null = null;
    let queryError: string | null = null;

    if (this.prisma.client) {
      const startTime = Date.now();
      try {
        const rows = (await this.prisma.client.$queryRaw`
          SELECT
            1 as connected,
            current_database()::text as database_name,
            current_user::text as database_role,
            NOW() as server_time;
        `) as DbDiagnosticsRow[];

        latencyMs = Date.now() - startTime;

        if (rows && rows.length > 0) {
          dbStatus = "CONNECTED";
          querySuccess = true;

          // Protected diagnostics logged strictly to server-side logs; never exposed in public JSON
          this.logger.log(
            `Database Health: Connected to [${rows[0].database_name}] as role [${rows[0].database_role}] in ${latencyMs}ms`,
          );
        }
      } catch (err: unknown) {
        dbStatus = "ERROR";
        querySuccess = false;
        queryError = err instanceof Error ? err.message : String(err);
        this.logger.error("Database query failed during health check:", err);
      }
    } else {
      dbStatus = "UNINITIALIZED";
    }

    return {
      status: querySuccess ? "ok" : "degraded",
      service: "@bdmart/api",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        querySuccess,
        latencyMs,
        error: queryError ? "DATABASE_QUERY_ERROR" : null,
      },
    };
  }
}
