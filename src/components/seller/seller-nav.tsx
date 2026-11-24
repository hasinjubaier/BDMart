import Link from 'next/link';

interface SellerNavProps {
  activeTab: 'products' | 'new' | 'inventory';
}

export function SellerNav({ activeTab }: SellerNavProps) {
  return (
    <nav
      aria-label="Seller Portal Navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}
    >
      <Link
        href="/seller/products"
        style={{
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 700,
          backgroundColor: activeTab === 'products' ? '#153b5b' : '#f1f5f9',
          color: activeTab === 'products' ? '#ffffff' : '#334155',
        }}
      >
        My Products
      </Link>

      <Link
        href="/seller/products/new"
        style={{
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 700,
          backgroundColor: activeTab === 'new' ? '#153b5b' : '#f1f5f9',
          color: activeTab === 'new' ? '#ffffff' : '#334155',
        }}
      >
        + Add New Product
      </Link>

      <Link
        href="/seller/inventory"
        style={{
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 700,
          backgroundColor: activeTab === 'inventory' ? '#153b5b' : '#f1f5f9',
          color: activeTab === 'inventory' ? '#ffffff' : '#334155',
        }}
      >
        Inventory & Stock Adjustments
      </Link>
    </nav>
  );
}
