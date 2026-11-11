import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const { Client } = pg;

// 1. Locate and load .env file (prioritize current directory, then project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localEnvPath = join(__dirname, ".env");
const rootEnvPath = join(__dirname, "..", "..", ".env");

if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  // Attempt default dotenv resolution
  dotenv.config();
}

/**
 * Sanitizes any raw error message by removing connection URLs, hosts, and credentials.
 * Maps raw errors into safe categories with actionable troubleshooting steps.
 */
function sanitizeError(error) {
  if (!error) {
    return {
      category: "UNKNOWN_ERROR",
      message: "An unknown error occurred.",
      troubleshooting: "Check network connectivity and verify the Neon dashboard status.",
    };
  }

  const rawMessage = error.message || String(error);
  const code = error.code || "";

  // Redact potential connection string patterns or passwords
  const sanitizedMessage = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_CONNECTION_URL]")
    .replace(/password=[^\s&]+/gi, "password=[REDACTED]")
    .replace(/:\/\/[^:]+:[^@]+@/g, "://[USER]:[REDACTED_PASSWORD]@");

  // Determine error category and troubleshooting advice
  if (code === "28P01" || /password authentication failed/i.test(rawMessage)) {
    return {
      category: "AUTHENTICATION_FAILED",
      message: "Password authentication failed for the specified database user.",
      troubleshooting:
        "Verify your database username and password in the Neon Console. If unsure, reset your role password in the Neon dashboard.",
    };
  }

  if (code === "3D000" || /database .* does not exist/i.test(rawMessage)) {
    return {
      category: "DATABASE_NOT_FOUND",
      message: "The specified database name was not found on this Neon instance.",
      troubleshooting:
        "Check that the database name in your connection string matches an existing database (default is typically 'neondb').",
    };
  }

  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    /getaddrinfo/i.test(rawMessage)
  ) {
    return {
      category: "HOST_UNREACHABLE",
      message: "DNS resolution failed for the database host.",
      troubleshooting:
        "Ensure your internet connection is active and verify that the hostname in your connection string is spelled correctly.",
    };
  }

  if (
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ETIMEDOUT" ||
    /timeout/i.test(rawMessage)
  ) {
    return {
      category: "CONNECTION_TIMEOUT",
      message: "Connection timed out before establishing a connection to the server.",
      troubleshooting:
        "The Neon compute endpoint may be waking up from scale-to-zero, or local firewall/VPN settings may be blocking outbound port 5432.",
    };
  }

  if (
    /ssl/i.test(rawMessage) ||
    /certificate/i.test(rawMessage) ||
    /tls/i.test(rawMessage)
  ) {
    return {
      category: "TLS_CONFIGURATION_ERROR",
      message: "TLS/SSL negotiation failed during connection handshake.",
      troubleshooting:
        "Ensure '?sslmode=require' is present in your connection string and that your system clock is accurate.",
    };
  }

  return {
    category: "DATABASE_CONNECTION_ERROR",
    message: sanitizedMessage,
    troubleshooting:
      "Verify the connection string format copied from the Neon Console and test again.",
  };
}

/**
 * Tests an individual PostgreSQL connection string with read-only validation.
 * Never performs writes, schema alterations, or exposes credentials.
 */
async function testSingleConnection(connectionUrl, connectionLabel) {
  if (!connectionUrl || typeof connectionUrl !== "string" || connectionUrl.trim() === "") {
    return {
      success: false,
      label: connectionLabel,
      error: {
        category: "MISSING_VARIABLE",
        message: `Environment variable for ${connectionLabel} is missing or empty.`,
        troubleshooting: `Define ${connectionLabel === "Pooled" ? "POOLED_DATABASE_URL" : "DIRECT_DATABASE_URL"} in your .env file.`,
      },
      metadata: null,
    };
  }

  // Neon requires SSL. We configure a 10-second connection timeout.
  const client = new Client({
    connectionString: connectionUrl.trim(),
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();

    const queryText =
      "SELECT 1 AS connected, current_database() AS database_name, current_user AS database_role, NOW() AS server_time;";
    const res = await client.query(queryText);

    if (!res.rows || res.rows.length === 0 || res.rows[0].connected !== 1) {
      throw new Error("Read-only validation query returned unexpected result.");
    }

    const row = res.rows[0];

    return {
      success: true,
      label: connectionLabel,
      error: null,
      metadata: {
        databaseName: String(row.database_name),
        databaseRole: String(row.database_role),
        serverTime: new Date(row.server_time).toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      label: connectionLabel,
      error: sanitizeError(err),
      metadata: null,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore cleanup error on failed connection
    }
  }
}

/**
 * Main Test Runner
 */
async function main() {
  const pooledUrl = process.env.POOLED_DATABASE_URL;
  const directUrl = process.env.DIRECT_DATABASE_URL;

  // Run both tests independently
  const pooledResult = await testSingleConnection(pooledUrl, "Pooled");
  const directResult = await testSingleConnection(directUrl, "Direct");

  // Determine metadata to display (from whichever connection succeeded)
  const successfulResult = pooledResult.success
    ? pooledResult
    : directResult.success
    ? directResult
    : null;

  const dbName = successfulResult ? successfulResult.metadata.databaseName : "Not available (Both failed)";
  const dbRole = successfulResult ? successfulResult.metadata.databaseRole : "Not available (Both failed)";
  const serverTime = successfulResult ? successfulResult.metadata.serverTime : "Not available (Both failed)";

  // Determine final outcome
  let finalSummary = "";
  let exitCode = 1;

  if (pooledResult.success && directResult.success) {
    finalSummary = "- Both connections working.";
    exitCode = 0;
  } else if (pooledResult.success && !directResult.success) {
    finalSummary = "- Only pooled connection working.";
    exitCode = 1;
  } else if (!pooledResult.success && directResult.success) {
    finalSummary = "- Only direct connection working.";
    exitCode = 1;
  } else {
    finalSummary = "- Neither connection working.";
    exitCode = 1;
  }

  // Print exact required report format
  console.log("================================================================================");
  console.log("NEON DATABASE CONNECTIVITY REPORT");
  console.log("================================================================================\n");

  console.log(`Pooled connection: ${pooledResult.success ? "PASS" : "FAIL"}`);
  console.log(`Direct connection: ${directResult.success ? "PASS" : "FAIL"}\n`);

  console.log(`Database name: ${dbName}`);
  console.log(`Database role: ${dbRole}`);
  console.log(`Server timestamp: ${serverTime}\n`);

  console.log("Final result:");
  console.log(finalSummary);

  // If any failures occurred, print sanitized troubleshooting info
  if (!pooledResult.success || !directResult.success) {
    console.log("\n--------------------------------------------------------------------------------");
    console.log("TROUBLESHOOTING & DIAGNOSTIC DETAILS (SANITIZED)");
    console.log("--------------------------------------------------------------------------------");

    if (!pooledResult.success) {
      console.log(`\n[Pooled Connection Failure]`);
      console.log(`Category: ${pooledResult.error.category}`);
      console.log(`Reason:   ${pooledResult.error.message}`);
      console.log(`Action:   ${pooledResult.error.troubleshooting}`);
    }

    if (!directResult.success) {
      console.log(`\n[Direct Connection Failure]`);
      console.log(`Category: ${directResult.error.category}`);
      console.log(`Reason:   ${directResult.error.message}`);
      console.log(`Action:   ${directResult.error.troubleshooting}`);
    }
    console.log("--------------------------------------------------------------------------------");
  }

  console.log("\n================================================================================");
  process.exit(exitCode);
}

main().catch((fatalErr) => {
  const sanitized = sanitizeError(fatalErr);
  console.error("\nFATAL UNCAUGHT RUNTIME ERROR:");
  console.error(`Category: ${sanitized.category}`);
  console.error(`Reason:   ${sanitized.message}`);
  console.error(`Action:   ${sanitized.troubleshooting}`);
  process.exit(1);
});

