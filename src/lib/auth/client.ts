'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  appId?: string;
}

export function getClientFirebaseConfig(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isClientFirebaseConfigured(): boolean {
  const config = getClientFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;

export function getFirebaseAuthClient(): Auth | null {
  if (typeof window === 'undefined') {
    return null; // Auth client is only available in the browser
  }

  if (firebaseAuthInstance) {
    return firebaseAuthInstance;
  }

  if (!isClientFirebaseConfigured()) {
    return null;
  }

  const config = getClientFirebaseConfig();

  if (getApps().length > 0) {
    firebaseAppInstance = getApps()[0]!;
  } else {
    firebaseAppInstance = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      appId: config.appId,
    });
  }

  firebaseAuthInstance = getAuth(firebaseAppInstance);
  return firebaseAuthInstance;
}

export function getGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export type { ConfirmationResult };
