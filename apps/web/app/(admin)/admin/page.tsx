import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <Link href="/" style={{ color: "#374151", textDecoration: "none" }}>
        ← Back to Ecosystem Portal
      </Link>
      <h1 style={{ marginTop: 16 }}>
        BDMart Administration & Moderation Console
      </h1>
      <p style={{ color: "#4b5563" }}>
        Internal platform console for business verification audits, master
        catalog taxonomy moderation, and financial clearing.
      </p>
      <div
        style={{
          padding: 20,
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
        }}
      >
        <strong>Compliance:</strong> Integrated validation schemas for
        Bangladesh Trade License, e-TIN, and BIN verification.
      </div>
    </div>
  );
}
