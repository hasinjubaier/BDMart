import type { Metadata } from "next";
import { AuthProvider } from "../lib/auth-context";
import { Navbar } from "../components/navbar";

export const metadata: Metadata = {
  title: "BDMart — Bangladesh-First B2B + B2C Commerce Marketplace",
  description:
    "Unified commerce marketplace ecosystem for manufacturers, wholesalers, and retail consumers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: 0,
          background: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
