import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { assertDevelopmentTarget } from '@/db/verify-target';
import { syncFirebaseUser } from './sync-user';
import { createSessionToken, verifySessionToken } from './session';
import { requireRole } from './require-role';
import { verifyFirebaseIdToken } from './admin';
import { AuthError } from './types';

describe('BD Mart Authentication & RBAC Test Suite', () => {
  beforeAll(async () => {
    // Confirm database target before any test execution
    const target = await assertDevelopmentTarget();
    expect(target.verified).toBe(true);
    expect(target.database).toBe('neondb');
    expect(target.endpoint).toBe('ep-billowing-resonance-beypcxyy');
  });

  afterAll(async () => {
    if (createdUserId) {
      const db = getDb();
      await db.delete(users).where(eq(users.id, createdUserId));
    }
  });

  const testUid = `test-firebase-uid-${Date.now()}`;
  const testPhone = `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testName = 'Test Automated Buyer';
  let createdUserId: string;

  it('1. First sign-in creates user with default buyer role and en locale', async () => {
    const user = await syncFirebaseUser({
      uid: testUid,
      phone: testPhone,
      email: `${testUid}@test.bdmart.com.bd`,
      name: testName,
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.firebaseUid).toBe(testUid);
    expect(user.role).toBe('buyer'); // Default role MUST be buyer
    expect(user.locale).toBe('en'); // Default locale MUST be English
    expect(user.name).toBe(testName);
    expect(user.phone).toBe(testPhone);

    createdUserId = user.id;

    // Verify row directly in PostgreSQL catalog
    const db = getDb();
    const [dbUser] = await db.select().from(users).where(eq(users.id, createdUserId)).limit(1);
    expect(dbUser).toBeDefined();
    expect(dbUser.role).toBe('buyer');
  });

  it('2. Repeat sign-in reuses existing database row and preserves existing role', async () => {
    const db = getDb();

    // Promote the test user to 'seller' to verify role preservation
    await db.update(users).set({ role: 'seller' }).where(eq(users.id, createdUserId));

    // Sign in again with the exact same firebaseUid
    const repeatUser = await syncFirebaseUser({
      uid: testUid,
      phone: testPhone,
      name: 'Updated Buyer Name',
    });

    // Must reuse the exact same database row
    expect(repeatUser.id).toBe(createdUserId);
    expect(repeatUser.firebaseUid).toBe(testUid);

    // CRITICAL: Role must PRESERVE 'seller' and NOT reset to 'buyer'
    expect(repeatUser.role).toBe('seller');
    expect(repeatUser.name).toBe('Updated Buyer Name');

    // Confirm row count didn't increase for this uid
    const rows = await db.select().from(users).where(eq(users.firebaseUid, testUid));
    expect(rows.length).toBe(1);
  });

  it('3. Session token creation and cryptographic verification', () => {
    const token = createSessionToken({
      id: createdUserId,
      firebaseUid: testUid,
      role: 'seller',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(2);

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(createdUserId);
    expect(verified?.firebaseUid).toBe(testUid);
    expect(verified?.role).toBe('seller');

    // Tampered token must be rejected
    const tamperedToken = token.slice(0, -4) + 'abcd';
    expect(verifySessionToken(tamperedToken)).toBeNull();

    // Malformed token must be rejected
    expect(verifySessionToken('invalid.token.structure')).toBeNull();
    expect(verifySessionToken('')).toBeNull();
  });

  it('4. Unauthenticated access to protected route is rejected with 401', async () => {
    // Calling requireRole with no token
    await expect(requireRole(['buyer', 'seller'])).rejects.toThrowError(AuthError);

    try {
      await requireRole(['buyer', 'seller']);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      const authErr = err as AuthError;
      expect(authErr.statusCode).toBe(401);
      expect(authErr.code).toBe('UNAUTHENTICATED');
    }
  });

  it('5. Authenticated user without required role is rejected with 403', async () => {
    // User is currently a 'seller'
    const sellerToken = createSessionToken({
      id: createdUserId,
      firebaseUid: testUid,
      role: 'seller',
    });

    // Attempt to access an admin-only resource
    try {
      await requireRole(['admin'], sellerToken);
      expect.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      const authErr = err as AuthError;
      expect(authErr.statusCode).toBe(403);
      expect(authErr.code).toBe('FORBIDDEN');
    }
  });

  it('6. Authenticated user with matching role is granted access', async () => {
    const db = getDb();
    // Promote user to 'admin'
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, createdUserId));

    const adminToken = createSessionToken({
      id: createdUserId,
      firebaseUid: testUid,
      role: 'admin',
    });

    const authorizedUser = await requireRole(['admin'], adminToken);
    expect(authorizedUser).toBeDefined();
    expect(authorizedUser.id).toBe(createdUserId);
    expect(authorizedUser.role).toBe('admin');
  });

  it('7. Production-mode check: Synthetic test token fallback cannot activate in production', async () => {
    try {
      vi.stubEnv('NODE_ENV', 'production');
      await expect(
        verifyFirebaseIdToken('test-token:uid:phone:role:name')
      ).rejects.toThrowError(/Synthetic test tokens are strictly disallowed in production mode/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('8. Production-mode check: Missing SESSION_SECRET fails closed in production', () => {
    try {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SESSION_SECRET', '');
      delete process.env.SESSION_SECRET;
      expect(() =>
        createSessionToken({
          id: 'test-id',
          firebaseUid: 'test-uid',
          role: 'buyer',
        })
      ).toThrowError(/SESSION_SECRET is required in production mode/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('9. Production-mode check: Missing Firebase Admin credentials fails closed with descriptive error', async () => {
    try {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('FIREBASE_ADMIN_CREDENTIALS', '');
      delete process.env.FIREBASE_ADMIN_CREDENTIALS;
      await expect(
        verifyFirebaseIdToken('sample-real-looking-jwt-token')
      ).rejects.toThrowError(/FIREBASE_ADMIN_NOT_CONFIGURED/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
