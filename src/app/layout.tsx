import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BD Mart — The Trusted Dual-Engine Marketplace',
  description: 'Bangladesh\'s premier dual-engine B2C retail and B2B wholesale e-commerce marketplace.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
