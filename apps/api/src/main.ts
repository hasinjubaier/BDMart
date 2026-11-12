import "reflect-metadata";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

// Explicitly load API environment from apps/api/.env or current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, "..");
const explicitApiEnv = path.join(apiDir, ".env");
const localEnv = path.resolve(process.cwd(), ".env");

if (existsSync(explicitApiEnv)) {
  config({ path: explicitApiEnv });
} else if (existsSync(localEnv)) {
  config({ path: localEnv });
} else {
  config();
}

async function bootstrap() {
  const logger = new Logger("BDMartApiBootstrap");
  const app = await NestFactory.create(AppModule);

  // Parse HttpOnly cookies
  app.use(cookieParser());

  // Configure CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:8081"];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global API routing prefix
  app.setGlobalPrefix("api");

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("BDMart Identity & Commerce API")
    .setDescription(
      "RESTful API Documentation for BDMart: Bangladesh-First B2B + B2C Commerce Marketplace",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);

  logger.log(`🚀 BDMart Backend API running on http://localhost:${port}/api`);
  logger.log(`   OpenAPI Docs: http://localhost:${port}/api/docs`);
  logger.log(`   Health Check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err) => {
  console.error("Fatal error during BDMart API bootstrap:", err);
  process.exit(1);
});
