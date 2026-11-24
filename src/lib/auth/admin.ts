import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { FirebaseUserPayload } from './types';

let firebaseAdminApp: App | null = null;

/**
 * Checks whether Firebase Admin credentials are configured in the environment.
 */
export function isFirebaseAuthConfigured(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );
}

/**
 * Initializes and returns the Firebase Admin App instance (singleton).
 */
export function getFirebaseAdminApp(): App | null {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0]!;
    return firebaseAdminApp;
  }

  const credentialsEnv = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (credentialsEnv) {
    try {
      const parsedCreds = typeof credentialsEnv === 'string' && credentialsEnv.trim().startsWith('{')
        ? JSON.parse(credentialsEnv)
        : credentialsEnv;
      firebaseAdminApp = initializeApp({
        credential: cert(parsedCreds),
      });
      return firebaseAdminApp;
    } catch (error) {
      console.error('[FirebaseAdmin] Failed to parse FIREBASE_ADMIN_CREDENTIALS:', error);
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return firebaseAdminApp;
  }

  return null;
}

/**
 * Verifies a Firebase ID token sent from the client.
 * In development or testing, if Firebase Admin credentials are not yet configured,
 * it accepts synthetic test tokens formatted as `test-token:<uid>:<phone>:<role>:<name>`
 * so test suites and local verification run reliably without external secrets.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseUserPayload> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing or invalid ID token.');
  }

  // Handle synthetic test tokens strictly for development and testing environments
  if (idToken.startsWith('test-token:')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY_ERROR: Synthetic test tokens are strictly disallowed in production mode.');
    }
    const parts = idToken.split(':');
    const uid = parts[1] || 'test-user-uid';
    const phone = parts[2] || '+8801700000000';
    const name = parts[4] || 'Test User';
    return {
      uid,
      phone,
      email: `${uid}@test.bdmart.com.bd`,
      name,
    };
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error(
      'FIREBASE_ADMIN_NOT_CONFIGURED: Firebase Admin SDK credentials are missing. ' +
      'Please configure FIREBASE_ADMIN_CREDENTIALS in .env.local.'
    );
  }

  const decodedToken = await getAuth(app).verifyIdToken(idToken);
  return {
    uid: decodedToken.uid,
    phone: decodedToken.phone_number || '',
    email: decodedToken.email || null,
    name: decodedToken.name || null,
  };
}
