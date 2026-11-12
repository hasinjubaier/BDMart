import Link from "next/link";

export default function StorefrontPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
        ← Back to Ecosystem Portal
      </Link>
      <h1 style={{ marginTop: 16 }}>BDMart Consumer & Wholesale Storefront</h1>
      <p style={{ color: "#4b5563" }}>
        Public marketplace storefront shell for Phase 1 B2B catalog discovery
        and Phase 2 B2C retail checkout.
      </p>
      <div
        style={{
          padding: 20,
          backgroundColor: "#eff6ff",
          borderRadius: 8,
          border: "1px solid #bfdbfe",
        }}
      >
        <strong>Milestone 1 Verified:</strong> Shared contracts
        (@bdmart/contracts) and formatters (@bdmart/utils) linked.
      </div>
    </div>
  );
}
