'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import {
  getFirebaseAuthClient,
  getGoogleAuthProvider,
  isClientFirebaseConfigured,
} from '@/lib/auth/client';
import { normalizeBdPhoneNumber } from '@/lib/auth/phone';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>('phone');
  const [rawPhone, setRawPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Check client-side configuration
  useEffect(() => {
    setIsFirebaseConfigured(isClientFirebaseConfigured());
  }, []);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Clean up recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Initialize RecaptchaVerifier
  const initRecaptchaVerifier = () => {
    const auth = getFirebaseAuthClient();
    if (!auth) {
      throw new Error('Firebase Auth client is not available.');
    }
    if (!recaptchaContainerRef.current) {
      throw new Error('reCAPTCHA container was not found in the DOM.');
    }

    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // Ignore
      }
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        setGeneralError('reCAPTCHA expired. Please try again.');
      },
    });

    return recaptchaVerifierRef.current;
  };

  // Synchronize Firebase session with BD Mart server
  const establishServerSession = async (idToken: string, name?: string | null, phone?: string | null) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name, phone }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to establish server session. Please try again.');
    }

    return response.json();
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setGeneralError('');
    setStatusMessage('');
    setIsLoading(true);

    const auth = getFirebaseAuthClient();
    if (!auth) {
      setGeneralError('Firebase client configuration is missing. Please configure .env.local.');
      setIsLoading(false);
      return;
    }

    try {
      const provider = getGoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setStatusMessage('Google account verified. Establishing session...');

      const idToken = await result.user.getIdToken();
      await establishServerSession(idToken, result.user.displayName, result.user.phoneNumber);

      setStatusMessage('Signed in successfully! Redirecting...');
      window.location.href = '/';
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (
        firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        setGeneralError('Account selection was cancelled. You may try again.');
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
        setGeneralError('Unauthorized domain. Please add localhost to authorized domains in Firebase Console.');
      } else {
        setGeneralError(firebaseError.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send Phone OTP Handler
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPhoneError('');
    setOtpError('');
    setGeneralError('');

    // Normalize phone number
    const validation = normalizeBdPhoneNumber(rawPhone);
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Please enter a valid Bangladeshi mobile number.');
      return;
    }

    const auth = getFirebaseAuthClient();
    if (!auth) {
      setGeneralError('Firebase client configuration is missing. Please check .env.local.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Sending verification code...');

    try {
      const verifier = initRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, validation.normalized, verifier);

      setConfirmationResult(confirmation);
      setNormalizedPhone(validation.normalized);
      setIsOtpSent(true);
      setResendCooldown(60);
      setStatusMessage(`Verification code sent to ${validation.normalized}`);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/invalid-phone-number') {
        setPhoneError('The phone number is invalid. Please enter a valid number.');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setGeneralError('Too many attempts. Please wait a moment and try again.');
      } else if (firebaseError.code === 'auth/billing-not-enabled') {
        setGeneralError('SMS billing is not enabled. Please use a configured test phone number in Firebase Console.');
      } else {
        setGeneralError(firebaseError.message || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Phone OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setGeneralError('');

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setGeneralError('No active verification session found. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Verifying code...');

    try {
      const result = await confirmationResult.confirm(cleanOtp);
      setStatusMessage('Code verified. Preparing session...');

      const idToken = await result.user.getIdToken();
      await establishServerSession(idToken, null, normalizedPhone);

      setStatusMessage('Signed in successfully! Redirecting...');
      window.location.href = '/';
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (
        firebaseError.code === 'auth/invalid-verification-code' ||
        firebaseError.code === 'auth/invalid-credential'
      ) {
        setOtpError('Invalid verification code. Please enter the correct code or click Resend code.');
      } else if (firebaseError.code === 'auth/code-expired') {
        setOtpError('Verification code has expired. Please click Resend code.');
      } else {
        setOtpError(firebaseError.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Change phone number action
  const handleChangeNumber = () => {
    setIsOtpSent(false);
    setOtpCode('');
    setOtpError('');
    setConfirmationResult(null);
    setStatusMessage('');
  };

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        backgroundColor: '#f8f9ff',
        color: '#121c28',
      }}
    >
      {/* Hidden container for invisible reCAPTCHA */}
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      {/* Brand Header */}
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#153b5b',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            BD Mart
          </h1>
        </Link>
        <p style={{ margin: 0, fontSize: '1rem', color: '#16a36a', fontWeight: 600 }}>
          Buyer &amp; Business Sign In
        </p>
      </header>

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e6e9ee',
          boxShadow: '0 4px 12px rgba(21, 59, 91, 0.06)',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Missing Firebase configuration banner */}
        {!isFirebaseConfigured && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '0.875rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#92400e',
              lineHeight: 1.5,
            }}
          >
            <strong>Notice:</strong> Local Firebase configuration is pending (
            <code>.env.local</code>). Live Google and Phone OTP sign-in will activate once configured.
          </div>
        )}

        {/* Global Error Banner */}
        {generalError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.875rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              color: '#dc2626',
              lineHeight: 1.5,
            }}
          >
            {generalError}
          </div>
        )}

        {/* Status Message Banner */}
        {statusMessage && !generalError && (
          <div
            role="status"
            aria-live="polite"
            style={{
              backgroundColor: '#eef4ff',
              border: '1px solid #cfe5ff',
              borderRadius: '8px',
              padding: '0.875rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              color: '#153b5b',
              lineHeight: 1.5,
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Provider Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Authentication Method"
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'phone'}
            onClick={() => {
              setAuthMethod('phone');
              setGeneralError('');
            }}
            style={{
              flex: 1,
              padding: '0.625rem',
              fontSize: '0.925rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: authMethod === 'phone' ? '#ffffff' : 'transparent',
              color: authMethod === 'phone' ? '#153b5b' : '#64748b',
              boxShadow: authMethod === 'phone' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Mobile OTP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'google'}
            onClick={() => {
              setAuthMethod('google');
              setGeneralError('');
            }}
            style={{
              flex: 1,
              padding: '0.625rem',
              fontSize: '0.925rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: authMethod === 'google' ? '#ffffff' : 'transparent',
              color: authMethod === 'google' ? '#153b5b' : '#64748b',
              boxShadow: authMethod === 'google' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Google
          </button>
        </div>

        {/* Tab 1: Phone OTP Flow */}
        {authMethod === 'phone' && (
          <div>
            {!isOtpSent ? (
              // Step 1: Phone Number Input Form
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="phone-input"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#153b5b',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Mobile number
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                    value={rawPhone}
                    onChange={(e) => {
                      setRawPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      border: phoneError ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  {phoneError && (
                    <p
                      role="alert"
                      style={{
                        margin: '0.375rem 0 0 0',
                        fontSize: '0.825rem',
                        color: '#dc2626',
                        fontWeight: 500,
                      }}
                    >
                      {phoneError}
                    </p>
                  )}
                  <p
                    style={{
                      margin: '0.375rem 0 0 0',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    Enter an 11-digit Bangladeshi mobile number (e.g. 01712345678).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: isLoading ? '#94a3b8' : '#153b5b',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {isLoading ? 'Sending code...' : 'Send code'}
                </button>
              </form>
            ) : (
              // Step 2: 6-Digit OTP Verification Form
              <form onSubmit={handleVerifyOtp}>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                      Sent to number:
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#153b5b' }}>
                      {normalizedPhone}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangeNumber}
                    disabled={isLoading}
                    style={{
                      fontSize: '0.825rem',
                      color: '#2563eb',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Change number
                  </button>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="otp-input"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#153b5b',
                      marginBottom: '0.5rem',
                    }}
                  >
                    6-digit verification code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value);
                      if (otpError) setOtpError('');
                    }}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '1.35rem',
                      letterSpacing: '0.35em',
                      textAlign: 'center',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: otpError ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {otpError && (
                    <p
                      role="alert"
                      style={{
                        margin: '0.375rem 0 0 0',
                        fontSize: '0.825rem',
                        color: '#dc2626',
                        fontWeight: 500,
                      }}
                    >
                      {otpError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.trim().length !== 6}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor:
                      isLoading || otpCode.trim().length !== 6 ? '#94a3b8' : '#16a36a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor:
                      isLoading || otpCode.trim().length !== 6 ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                    marginBottom: '1rem',
                  }}
                >
                  {isLoading ? 'Verifying code...' : 'Verify code'}
                </button>

                {/* Resend OTP Button with 60-Second Cooldown */}
                <div style={{ textAlign: 'center' }}>
                  {resendCooldown > 0 ? (
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Resend code in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isLoading}
                      style={{
                        fontSize: '0.875rem',
                        color: '#153b5b',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Google Sign-In Flow */}
        {authMethod === 'google' && (
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#64748b',
                lineHeight: 1.6,
                margin: '0 0 1.5rem 0',
              }}
            >
              Sign in securely to BD Mart using your existing Google account.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              aria-label="Sign in with Google"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.25rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Google G Logo SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          By signing in, you agree to BD Mart&apos;s{' '}
          <span style={{ color: '#153b5b', fontWeight: 500 }}>Terms of Service</span> and{' '}
          <span style={{ color: '#153b5b', fontWeight: 500 }}>Privacy Policy</span>.
        </div>
      </div>

      {/* Back to Home Link */}
      <footer style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link
          href="/"
          style={{
            fontSize: '0.875rem',
            color: '#153b5b',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          &larr; Back to homepage
        </Link>
      </footer>
    </main>
  );
}
