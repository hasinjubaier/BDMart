"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const phoneParam = searchParams.get("phone") || "";
  const otpParam = searchParams.get("otp") || "";

  const [fullName, setFullName] = useState("");
  const [fullNameBn, setFullNameBn] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"bn" | "en">("bn");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    try {
      setLoading(true);
      await register({
        phone: phoneParam,
        otp: otpParam,
        fullName: fullName.trim(),
        fullNameBn: fullNameBn.trim() || undefined,
        email: email.trim() || undefined,
        preferredLanguage,
      });

      router.push("/profile");
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
        maxWidth: 500,
        margin: "50px auto",
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
            Create your Account
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            Phone verified: <strong>{phoneParam}</strong>
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

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Full Name (English) *
            </label>
            <input
              type="text"
              placeholder="e.g. Mohammad Rahim"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              পূর্ণ নাম (বাংলা - ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: মোহাম্মদ রহিম"
              value={fullNameBn}
              onChange={(e) => setFullNameBn(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="rahim@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Preferred Language (পছন্দের ভাষা)
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) =>
                setPreferredLanguage(e.target.value as "bn" | "en")
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#ffffff",
                boxSizing: "border-box",
              }}
              disabled={loading}
            >
              <option value="bn">বাংলা (Bengali)</option>
              <option value="en">English</option>
            </select>
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
            {loading
              ? "Creating Account..."
              : "Complete Registration (নিবন্ধন সম্পন্ন করুন)"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href="/login"
            style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}
          >
            &larr; Start over
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
