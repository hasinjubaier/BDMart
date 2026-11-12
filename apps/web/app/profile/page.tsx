"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { apiClient } from "../../lib/api-client";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [fullNameBn, setFullNameBn] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"bn" | "en">("bn");
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (user?.profile) {
      setFullName(user.profile.fullName || "");
      setFullNameBn(user.profile.fullNameBn || "");
      setPreferredLanguage(
        (user.profile.preferredLanguage as "bn" | "en") || "bn",
      );
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px 20px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2>Loading your profile...</h2>
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      setSaving(true);
      await updateProfile({
        fullName: fullName.trim(),
        fullNameBn: fullNameBn.trim() || undefined,
        preferredLanguage,
      });
      setIsEditing(false);
      setStatusMessage("Profile updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleDeactivate = async () => {
    if (
      window.confirm(
        "Are you sure you want to deactivate your BDMart account? All sessions will be terminated.",
      )
    ) {
      try {
        await apiClient.post("/v1/users/me/deactivate");
        await logout();
        router.push("/");
      } catch (err: unknown) {
        alert(
          err instanceof Error ? err.message : "Failed to deactivate account",
        );
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "32px",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          border: "1px solid #eaeaea",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f3f4f6",
            paddingBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: "#111827",
              }}
            >
              User Profile (ব্যবহারকারী প্রোফাইল)
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0 0" }}>
              Identity & Access Management &bull; Milestone 2
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Logout (লগআউট)
          </button>
        </div>

        {statusMessage && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: statusMessage.startsWith("Error")
                ? "#fef2f2"
                : "#ecfdf5",
              color: statusMessage.startsWith("Error") ? "#991b1b" : "#065f46",
            }}
          >
            {statusMessage}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{ background: "#f9fafb", padding: 14, borderRadius: 8 }}
            >
              <span
                style={{ fontSize: 12, color: "#6b7280", display: "block" }}
              >
                Phone Number
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                {user.phone}
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {user.isPhoneVerified ? "VERIFIED" : "UNVERIFIED"}
              </span>
            </div>

            <div
              style={{ background: "#f9fafb", padding: 14, borderRadius: 8 }}
            >
              <span
                style={{ fontSize: 12, color: "#6b7280", display: "block" }}
              >
                Account Status / Roles
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                {user.status} &bull; {user.roles.join(", ")}
              </span>
            </div>
          </div>

          {!isEditing ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <span
                  style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                >
                  Full Name (English)
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                >
                  {user.profile?.fullName || "Not provided"}
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span
                  style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                >
                  পূর্ণ নাম (বাংলা)
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                >
                  {user.profile?.fullNameBn || "প্রদান করা হয়নি"}
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <span
                  style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                >
                  Preferred Language
                </span>
                <span
                  style={{ fontSize: 15, fontWeight: 500, color: "#374151" }}
                >
                  {user.profile?.preferredLanguage === "bn"
                    ? "বাংলা (Bengali)"
                    : "English"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Edit Profile (সম্পাদনা করুন)
                </button>
                <Link
                  href="/"
                  style={{
                    display: "inline-block",
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    color: "#374151",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Go to Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Full Name (English)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  পূর্ণ নাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={fullNameBn}
                  onChange={(e) => setFullNameBn(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                  }}
                />
              </div>

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
                  Preferred Language (ভাষা)
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) =>
                    setPreferredLanguage(e.target.value as "bn" | "en")
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    padding: "8px 16px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div
            style={{
              marginTop: 40,
              borderTop: "1px solid #fee2e2",
              paddingTop: 20,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#991b1b",
                display: "block",
                marginBottom: 6,
              }}
            >
              Danger Zone
            </span>
            <button
              onClick={handleDeactivate}
              style={{
                background: "none",
                border: "1px solid #f87171",
                color: "#dc2626",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Deactivate My Account (অ্যাকাউন্ট নিষ্ক্রিয় করুন)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
