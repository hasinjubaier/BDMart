import { Pool } from "@neondatabase/serverless";
export interface DatabaseDiagnostics {
    status: "connected" | "error";
    pooledHost: string;
    unpooledHost?: string;
    currentDatabase: string;
    currentUser: string;
    version: string;
    serverTime: string;
    branchName?: string;
    branchId?: string;
    error?: string;
}
export interface E2ETestResult {
    step: string;
    status: "PASSED" | "FAILED";
    details?: any;
    durationMs: number;
}
export declare function getDatabaseUrls(): {
    databaseUrl: string;
    databaseUrlUnpooled: string | undefined;
    branchName: string | undefined;
    branchId: string | undefined;
};
/**
 * Primary serverless SQL query client using @neondatabase/serverless over HTTPS.
 * Best practice for serverless and application read/write query traffic on Neon.
 */
export declare function createSqlClient(url?: string): import("@neondatabase/serverless").NeonQueryFunction<false, false>;
/**
 * Standard WebSocket connection pool for long-lived/transactional workloads.
 */
export declare function createConnectionPool(url?: string): Pool;
/**
 * Executes deep health check and metadata introspection on the connected Neon Postgres instance.
 */
export declare function runDiagnostics(): Promise<DatabaseDiagnostics>;
/**
 * Runs a complete End-to-End database verification cycle:
 * 1. Connectivity test
 * 2. Schema DDL test (create test table)
 * 3. DML Write test (insert test record)
 * 4. DML Read test (verify inserted record)
 * 5. Clean-up (drop test table)
 */
export declare function runEndToEndVerification(): Promise<E2ETestResult[]>;
