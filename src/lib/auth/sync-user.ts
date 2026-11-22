import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import type { FirebaseUserPayload, UserRecord } from './types';

/**
 * Synchronizes a verified Firebase user with the PostgreSQL `users` table.
 *
 * Rules:
 * 1. If user with matching `firebase_uid` exists:
 *    - Reuses the existing database row.
 *    - PRESERVES the existing `role` (does NOT reset to 'buyer').
 *    - Updates `name` or `email` if newly provided.
 * 2. If user with matching `phone` exists without `firebase_uid`:
 *    - Links the `firebase_uid` to the existing user row.
 *    - PRESERVES the existing `role`.
 * 3. If no matching user exists:
 *    - Inserts a new user with default role = 'buyer' and default locale = 'bn'.
 */
export async function syncFirebaseUser(payload: FirebaseUserPayload): Promise<UserRecord> {
  if (!payload.uid || !payload.uid.trim()) {
    throw new Error('firebaseUid is required for user synchronization.');
  }

  const db = getDb();

  // 1. Check for existing user by firebase_uid
  const [existingByUid] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, payload.uid))
    .limit(1);

  if (existingByUid) {
    // Preserve existing role. Update profile info if changed.
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    let hasUpdates = false;

    if (payload.name && payload.name !== existingByUid.name) {
      updates.name = payload.name;
      hasUpdates = true;
    }
    if (payload.email && payload.email !== existingByUid.email) {
      updates.email = payload.email;
      hasUpdates = true;
    }
    if (payload.phone && payload.phone !== existingByUid.phone) {
      updates.phone = payload.phone;
      hasUpdates = true;
    }

    if (hasUpdates) {
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, existingByUid.id))
        .returning();
      return (updated || existingByUid) as UserRecord;
    }

    return existingByUid as UserRecord;
  }

  // 2. Check for existing user by phone (e.g. pre-seeded or invited user)
  if (payload.phone && payload.phone.trim()) {
    const [existingByPhone] = await db
      .select()
      .from(users)
      .where(eq(users.phone, payload.phone))
      .limit(1);

    if (existingByPhone) {
      // Link firebase_uid, PRESERVE existing role
      const [linkedUser] = await db
        .update(users)
        .set({
          firebaseUid: payload.uid,
          updatedAt: new Date(),
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.email ? { email: payload.email } : {}),
        })
        .where(eq(users.id, existingByPhone.id))
        .returning();

      return (linkedUser || existingByPhone) as UserRecord;
    }
  }

  // 3. Brand new user: Assign default 'buyer' role and 'bn' locale
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      firebaseUid: payload.uid,
      phone: payload.phone || `+8801${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: payload.email || null,
      name: payload.name || 'BD Mart Customer',
      role: 'buyer', // Default role for first-time buyers
      locale: 'bn',  // Default locale is Bengali
    })
    .returning();

  return newUser as UserRecord;
}
