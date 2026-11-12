import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load database environment for Prisma CLI commands
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgEnv = path.resolve(__dirname, ".env");
const localEnv = path.resolve(process.cwd(), ".env");

if (existsSync(pkgEnv)) {
  config({ path: pkgEnv });
} else if (existsSync(localEnv)) {
  config({ path: localEnv });
}

/**
 * Prisma 6+ Configuration:
 * Maps direct unpooled connection (without "-pooler") for CLI schema migrations.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.POOLED_DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost/neondb",
  },
});
