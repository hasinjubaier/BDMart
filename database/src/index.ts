import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Explicitly load package-level .env if present (e.g. for database package standalone scripts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgEnv = path.resolve(__dirname, "..", ".env");
const localEnv = path.resolve(process.cwd(), ".env");

if (existsSync(pkgEnv)) {
  config({ path: pkgEnv });
} else if (existsSync(localEnv)) {
  config({ path: localEnv });
}

// Configure WebSocket transport for Neon driver adapter
neonConfig.webSocketConstructor = ws;

export interface PrismaClientOptions {
  connectionString?: string;
  logQueries?: boolean;
}

/**
 * Creates an instance of PrismaClient configured with the modern Neon serverless driver adapter.
 * Uses the pooled connection string (with "-pooler") for optimal performance in application runtime.
 */
export function createPrismaClient(
  options: PrismaClientOptions = {},
): PrismaClient {
  const connectionString =
    options.connectionString ||
    process.env.DATABASE_URL ||
    process.env.POOLED_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or POOLED_DATABASE_URL is required to initialize PrismaClient with Neon driver adapter.",
    );
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: options.logQueries
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
  });
}

export * from "@prisma/client";
