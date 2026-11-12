import Link from "next/link";

export default function SellerPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <Link href="/" style={{ color: "#4f46e5", textDecoration: "none" }}>
        ← Back to Ecosystem Portal
      </Link>
      <h1 style={{ marginTop: 16 }}>BDMart Merchant & Supplier Operations</h1>
      <p style={{ color: "#4b5563" }}>
        Seller operations center: listings management, volume price tiering,
        warehouse inventory, and B2B RFQ quotation desk.
      </p>
      <div
        style={{
          padding: 20,
          backgroundColor: "#f5f3ff",
          borderRadius: 8,
          border: "1px solid #ddd6fe",
        }}
      >
        <strong>Boundary Rule:</strong> Zero direct database imports. Interacts
        exclusively with @bdmart/api over HTTPS.
      </div>
    </div>
  );
}
