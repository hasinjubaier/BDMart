import { neon } from '@neondatabase/serverless';

export interface VerifiedTarget {
  endpoint: string;
  database: string;
  verified: boolean;
}

const EXPECTED_ENDPOINT_ID = 'ep-billowing-resonance-beypcxyy';
const EXPECTED_DATABASE = 'neondb';

/**
 * Validates that the current DATABASE_URL points strictly to the approved
 * development branch and endpoint on Neon before performing operations.
 * Credentials and secrets are never printed.
 */
export async function assertDevelopmentTarget(): Promise<VerifiedTarget> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured in the environment.');
  }

  let host: string;
  try {
    const parsed = new URL(databaseUrl);
    host = parsed.hostname;
  } catch {
    throw new Error('DATABASE_URL could not be parsed as a valid connection URL.');
  }

  // Confirm endpoint ID in hostname
  if (!host.includes(EXPECTED_ENDPOINT_ID)) {
    throw new Error(
      `ABORT: Configured host does not match expected development endpoint [${EXPECTED_ENDPOINT_ID}]. Host is on a different endpoint.`
    );
  }

  // Execute read-only verification query
  const sql = neon(databaseUrl);
  const rows = await sql`SELECT current_database() AS db_name;` as [{ db_name: string }];
  const actualDb = rows[0]?.db_name;

  if (actualDb !== EXPECTED_DATABASE) {
    throw new Error(
      `ABORT: Connected database '${actualDb}' does not match expected database '${EXPECTED_DATABASE}'.`
    );
  }

  return {
    endpoint: EXPECTED_ENDPOINT_ID,
    database: actualDb,
    verified: true,
  };
}
