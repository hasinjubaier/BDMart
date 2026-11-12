"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, requestOtp } = useAuth();

  const phoneParam = searchParams.get("phone") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setErrorMessage("Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(phoneParam, cleanOtp);

      if (res.isNewUser) {
        // Direct to profile completion/registration
        router.push(
          `/register?phone=${encodeURIComponent(phoneParam)}&otp=${encodeURIComponent(cleanOtp)}`,
        );
      } else {
        // Existing user authenticated -> route to profile
        router.push("/profile");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    try {
      const res = await requestOtp(phoneParam, "LOGIN");
      setResendCooldown(res.cooldownSeconds || 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
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
            Verify Phone Number
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            Enter the 6-digit OTP code sent to{" "}
            <strong>{phoneParam || "your mobile"}</strong>
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

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              6-Digit Security Code (নিরাপত্তা কোড)
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{
                width: "200px",
                padding: "12px",
                fontSize: 24,
                letterSpacing: "8px",
                textAlign: "center",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                outline: "none",
                fontWeight: 700,
              }}
              disabled={loading}
              autoFocus
            />
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
            }}
          >
            {loading ? "Verifying Code..." : "Verify & Sign In (যাচাই করুন)"}
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
            Didn&apos;t receive code?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{
                background: "none",
                border: "none",
                color: resendCooldown > 0 ? "#9ca3af" : "#059669",
                fontWeight: 600,
                cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                padding: 0,
              }}
            >
              Resend{" "}
              {resendCooldown > 0
                ? `(${resendCooldown}s)`
                : "Now (পুনরায় পাঠান)"}
            </button>
          </p>
          <div style={{ marginTop: 12 }}>
            <Link
              href="/login"
              style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}
            >
              Change Phone Number
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
