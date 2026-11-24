import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { ProductCard } from '@/components/catalog/product-card';
import { getSellerStorefront } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

interface SellerStorefrontProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SellerStorefrontPage({ params }: SellerStorefrontProps) {
  const { id } = await params;
  const storefront = await getSellerStorefront(id);

  if (!storefront) {
    notFound();
  }

  const { seller, products: sellerProducts, totalProducts } = storefront;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 3rem' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          <Link href="/" style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{seller.shopName}</span>
        </nav>

        {/* Seller Profile Banner */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
              }}
            >
              🏪
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#153b5b' }}>
                  {seller.shopName}
                </h1>
                {seller.kycStatus === 'approved' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#166534',
                      backgroundColor: '#dcfce7',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    ✓ Verified Merchant
                  </span>
                )}
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Owner: <strong>{seller.ownerName}</strong> &bull; Member since{' '}
                {new Date(seller.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a36a', display: 'block' }}>
              {totalProducts}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Active Products</span>
          </div>
        </div>

        {/* Products Grid */}
        <section aria-label={`${seller.shopName} Catalog`}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#153b5b', marginBottom: '1rem' }}>
            Store Catalog ({totalProducts})
          </h2>

          {sellerProducts.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '2.5rem',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              This merchant has no active listings currently.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {sellerProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
