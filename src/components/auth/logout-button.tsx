'use client';

import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/auth/client';

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Sign out from Firebase client SDK (if initialized)
      const auth = getFirebaseAuthClient();
      if (auth) {
        await signOut(auth).catch(() => {
          // Ignore client signOut errors
        });
      }

      // 2. Call server endpoint to clear HTTP-only bdmart_session cookie
      const response = await fetch('/api/auth/session', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear server session. Please try again.');
      }

      // 3. Force full browser refresh to reset all server and client states
      window.location.href = '/';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        aria-label="Sign out of BD Mart"
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {isLoading ? 'Signing out...' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
          {error}
        </p>
      )}
    </div>
  );
}
