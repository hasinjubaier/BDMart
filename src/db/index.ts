import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Returns a server-side Drizzle database instance connected to Neon.
 * Throws a descriptive error if DATABASE_URL is not set.
 */
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured. Server database access requires DATABASE_URL.');
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

/**
 * Health check helper to test Neon connectivity with a read-only query.
 */
export async function testDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      status: 'pending',
      message: 'Neon connection verification pending (no credentials configured in environment)',
    };
  }
  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT 1 as result;`;
    return {
      status: 'connected',
      result,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database connection error',
    };
  }
}
