import Link from "next/link";
import { formatBdt } from "@bdmart/utils";

export default function HomePage() {
  const sampleWholesalePrice = formatBdt(1250000); // 12,500 BDT
  const sampleRetailPrice = formatBdt(150000); // 1,500 BDT

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
      <header
        style={{
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: 24,
          marginBottom: 32,
        }}
      >
        <h1
          style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#111827" }}
        >
          BDMart Marketplace Ecosystem
        </h1>
        <p style={{ color: "#4b5563", fontSize: 16, marginTop: 8 }}>
          Bangladesh-first unified B2B wholesale procurement and B2C retail
          marketplace.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        {/* Customer Storefront */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            backgroundColor: "#f9fafb",
          }}
        >
          <h2 style={{ fontSize: 20, margin: "0 0 12px 0", color: "#1f2937" }}>
            🛒 Consumer & Buyer Storefront
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            Browse verified suppliers, purchase retail goods, or initiate bulk
            wholesale orders with volume pricing.
          </p>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#fff",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Sample Retail Starting At:
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>
              {sampleRetailPrice}
            </div>
          </div>
          <Link
            href="/storefront"
            style={{
              display: "inline-block",
              backgroundColor: "#2563eb",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open Storefront →
          </Link>
        </div>

        {/* Seller Portal */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            backgroundColor: "#f9fafb",
          }}
        >
          <h2 style={{ fontSize: 20, margin: "0 0 12px 0", color: "#1f2937" }}>
            🏭 Merchant & Supplier Portal
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            Manage warehouse inventory, configure multi-tier wholesale pricing,
            bid on RFQs, and fulfill orders.
          </p>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#fff",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Sample Wholesale Bulk Tier:
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#4f46e5" }}>
              {sampleWholesalePrice} / 500 pcs
            </div>
          </div>
          <Link
            href="/seller"
            style={{
              display: "inline-block",
              backgroundColor: "#4f46e5",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Seller Dashboard →
          </Link>
        </div>

        {/* Admin Portal */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            backgroundColor: "#f9fafb",
          }}
        >
          <h2 style={{ fontSize: 20, margin: "0 0 12px 0", color: "#1f2937" }}>
            🛡️ Administration & Moderation
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            Review merchant trade licenses & e-TINs, moderate master product
            catalog, and clear bank settlements.
          </p>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#fff",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Platform Compliance:
            </span>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Verified Bangladesh Entities Only
            </div>
          </div>
          <Link
            href="/admin"
            style={{
              display: "inline-block",
              backgroundColor: "#374151",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Admin Console →
          </Link>
        </div>
      </section>
    </main>
  );
}
