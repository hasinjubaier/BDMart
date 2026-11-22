import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import type { SessionPayload, UserRecord } from './types';

export const SESSION_COOKIE_NAME = 'bdmart_session';
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const DEFAULT_SECRET = 'bdmart_dev_session_signing_secret_do_not_use_in_prod';

function getSigningSecret(): string {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

/**
 * Creates a signed session token containing user details and an expiration timestamp.
 */
export function createSessionToken(user: { id: string; firebaseUid: string; role: string }): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_DURATION_SECONDS;

  const payload: SessionPayload = {
    userId: user.id,
    firebaseUid: user.firebaseUid,
    role: user.role,
    iat,
    exp,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadEncoded)
    .digest('base64url');

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verifies the integrity and validity of a signed session token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadEncoded)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from the session cookie or provided token.
 * Reads the latest user data and role directly from the database.
 */
export async function getSessionUser(tokenOverride?: string): Promise<UserRecord | null> {
  let token = tokenOverride;

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // In non-request environments (e.g. tests), cookies() might not be available
      return null;
    }
  }

  if (!token) return null;

  const verified = verifySessionToken(token);
  if (!verified) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, verified.userId))
    .limit(1);

  if (!user) return null;

  return user as UserRecord;
}

/**
 * Cookie options for establishing the secure session cookie.
 */
export const sessionCookieOptions = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};
