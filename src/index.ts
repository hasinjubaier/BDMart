import http from "node:http";
import { runDiagnostics, runEndToEndVerification } from "./db/client.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const IS_TEST_RUN = process.argv.includes("--test") || process.argv.includes("--verify");

async function main() {
  console.log("================================================================================");
  console.log(" BDMart — Neon Cloud Services Initialization & End-to-End Verification");
  console.log("================================================================================");

  // 1. Diagnostics Check
  console.log("\n[1/3] Querying Neon Postgres Diagnostics via Pooled Connection...");
  const diagnostics = await runDiagnostics();

  console.log(`- Connection Status : ${diagnostics.status.toUpperCase()}`);
  console.log(`- Pooled Host       : ${diagnostics.pooledHost}`);
  console.log(`- Unpooled Host     : ${diagnostics.unpooledHost || "None"}`);
  console.log(`- Database Name     : ${diagnostics.currentDatabase}`);
  console.log(`- Database User     : ${diagnostics.currentUser}`);
  console.log(`- Neon Branch       : ${diagnostics.branchName || "production"} (${diagnostics.branchId || "N/A"})`);
  console.log(`- Server Timestamp  : ${diagnostics.serverTime}`);
  console.log(`- Engine Version    : ${diagnostics.version.split(" ")[0]} ${diagnostics.version.split(" ")[1]}`);

  if (diagnostics.status !== "connected") {
    console.error("\n[FATAL] Failed to connect to Neon Postgres:", diagnostics.error);
    process.exit(1);
  }

  // 2. End-to-End Database Cycle Test
  console.log("\n[2/3] Executing End-to-End Service Tests (DDL, Insert, Select, Drop)...");
  const testResults = await runEndToEndVerification();

  let allPassed = true;
  for (const res of testResults) {
    const symbol = res.status === "PASSED" ? "✓" : "✗";
    console.log(`  ${symbol} ${res.step} [${res.status}] (${res.durationMs}ms)`);
    if (res.status === "FAILED") {
      allPassed = false;
      console.error(`    Details: ${JSON.stringify(res.details)}`);
    }
  }

  if (!allPassed) {
    console.error("\n[ERROR] One or more End-to-End tests failed.");
    process.exit(1);
  }

  console.log("\n[3/3] All Neon Postgres services verified successfully!");

  if (IS_TEST_RUN) {
    console.log("\n[TEST MODE] Completed successfully. Exiting clean.");
    process.exit(0);
  }

  // 3. Start Application HTTP Server
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/health" || req.url === "/api/health") {
      const liveDiag = await runDiagnostics();
      const statusCode = liveDiag.status === "connected" ? 200 : 503;
      res.writeHead(statusCode);
      res.end(
        JSON.stringify({
          status: liveDiag.status,
          service: "BDMart API",
          database: {
            provider: "Neon Managed PostgreSQL",
            branch: liveDiag.branchName,
            pooledHost: liveDiag.pooledHost,
            unpooledHost: liveDiag.unpooledHost,
            serverTime: liveDiag.serverTime,
          },
        })
      );
      return;
    }

    if (req.url === "/test" || req.url === "/api/test") {
      const liveTests = await runEndToEndVerification();
      const passed = liveTests.every((t) => t.status === "PASSED");
      res.writeHead(passed ? 200 : 500);
      res.end(JSON.stringify({ passed, results: liveTests }));
      return;
    }

    // Default root
    res.writeHead(200);
    res.end(
      JSON.stringify({
        name: "BDMart Marketplace API",
        version: "1.0.0",
        milestone: "0.1",
        services: {
          database: "Neon Lakebase Postgres (Connected)",
          branch: diagnostics.branchName,
        },
        endpoints: {
          health: "/health",
          test: "/test",
        },
      })
    );
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 BDMart application running on http://localhost:${PORT}`);
    console.log(`   - Health check: http://localhost:${PORT}/health`);
    console.log(`   - Service test: http://localhost:${PORT}/test`);
  });

  const shutdown = () => {
    console.log("\nReceived shutdown signal, terminating server...");
    server.close(() => {
      console.log("Server closed cleanly.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Unhandled fatal exception during application startup:", err);
  process.exit(1);
});

