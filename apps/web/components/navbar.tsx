"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link
          href="/"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#059669",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🇧🇩 BDMart</span>
        </Link>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link
            href="/storefront"
            style={{ fontSize: 14, color: "#4b5563", textDecoration: "none" }}
          >
            Storefront
          </Link>
          <Link
            href="/seller"
            style={{ fontSize: 14, color: "#4b5563", textDecoration: "none" }}
          >
            Seller Center
          </Link>
          <Link
            href="/admin"
            style={{ fontSize: 14, color: "#4b5563", textDecoration: "none" }}
          >
            Admin
          </Link>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isLoading ? (
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            Checking session...
          </span>
        ) : user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/profile"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f3f4f6",
                padding: "6px 12px",
                borderRadius: 6,
              }}
            >
              <span>👤 {user.profile?.fullName || user.phone}</span>
            </Link>
            <button
              onClick={() => logout()}
              style={{
                fontSize: 13,
                background: "none",
                border: "1px solid #d1d5db",
                color: "#4b5563",
                padding: "5px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#059669",
                textDecoration: "none",
                border: "1px solid #059669",
                padding: "6px 14px",
                borderRadius: 6,
              }}
            >
              Sign in (লগইন)
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
