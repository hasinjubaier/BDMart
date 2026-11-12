"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp } = useAuth();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMessage("Please enter your Bangladesh mobile phone number.");
      return;
    }

    try {
      setLoading(true);
      await requestOtp(cleanPhone, "LOGIN");
      // Navigate to OTP verification page
      router.push(`/verify-otp?phone=${encodeURIComponent(cleanPhone)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 460,
        margin: "60px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "36px 32px",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid #eaeaea",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Sign in to BDMart
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            Bangladesh-First B2B + B2C Commerce Marketplace
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #f87171",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Mobile Phone Number (বাংলাদেশ)
            </label>
            <div
              style={{
                display: "flex",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  background: "#f3f4f6",
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "#4b5563",
                  borderRight: "1px solid #d1d5db",
                  fontWeight: 600,
                }}
              >
                🇧🇩 +880
              </span>
              <input
                type="tel"
                placeholder="1XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 15,
                  border: "none",
                  outline: "none",
                }}
                disabled={loading}
                autoFocus
              />
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
              Format: 01XXXXXXXXX or 1XXXXXXXXX
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#9ca3af" : "#059669",
              color: "#ffffff",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading
              ? "Sending OTP Code..."
              : "Continue with OTP (ওটিপি পাঠান)"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            borderTop: "1px solid #f3f4f6",
            paddingTop: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            By continuing, you agree to BDMart&apos;s Terms of Service and
            Privacy Policy.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: "#059669",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
