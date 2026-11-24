import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { VariantSelector } from '@/components/catalog/variant-selector';
import { getProductBySlug } from '@/server/services/catalog.service';
import { formatBDT } from '@/lib/formatters';
import { SafeImage } from '@/components/ui/safe-image';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    variant?: string;
  }>;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const product = await getProductBySlug(slug);

  // If product does not exist or is not active, return 404
  if (!product) {
    notFound();
  }

  const primaryImage = product.images[0]?.storagePath || '/placeholder-product.svg';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main
        style={{
          flex: '1 0 auto',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: '1.5rem 1rem 4rem',
        }}
      >
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}
        >
          <Link href="/" style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <Link href={`/categories/${product.category.slug}`} style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>
            {product.category.name}
          </Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.title}</span>
        </nav>

        {/* Product Details Section (Responsive Layout down to 360px) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '2.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: 'clamp(1rem, 4vw, 2rem)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Gallery / Images Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                width: '100%',
                paddingTop: '80%',
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
              }}
            >
              <SafeImage
                src={primaryImage}
                alt={product.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* Thumbnail selector if multiple images */}
            {product.images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {product.images.map((img, idx) => (
                  <div
                    key={img.id}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid #16a36a' : '1px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={img.storagePath}
                      alt={`${product.title} view ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Meta & Interactive Buying Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Category & B2B Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                href={`/categories/${product.category.slug}`}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#153b5b',
                  backgroundColor: '#f1f5f9',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  textDecoration: 'none',
                }}
              >
                {product.category.name}
              </Link>

              {product.isB2bEnabled && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                  }}
                >
                  B2B Wholesale Enabled • MOQ: {product.moq} pcs
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              data-testid="pdp-product-title"
              style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.85rem)',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {product.title}
            </h1>

            {/* Seller Info Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>🏪</div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                  Sold & Fulfilled by
                </span>
                <Link
                  href={`/sellers/${product.seller.id}`}
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#153b5b',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{product.seller.shopName}</span>
                  {product.seller.kycStatus === 'approved' && (
                    <span
                      title="Verified BD Mart Seller"
                      style={{
                        color: '#16a36a',
                        fontSize: '0.75rem',
                        backgroundColor: '#dcfce7',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '9999px',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Verified
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Interactive Variant Selection with Dynamic Price & Availability */}
            <VariantSelector
              variants={product.variants}
              basePrice={product.basePrice}
              initialSku={resolvedSearchParams.variant}
            />

            {/* Wholesale Tier Ladder Table (if B2B enabled) */}
            {product.isB2bEnabled && product.tiers.length > 0 && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#166534',
                  }}
                >
                  Wholesale Volume Pricing Ladder
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.825rem',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '1px solid #86efac' }}>
                        <th style={{ padding: '0.4rem 0', color: '#166534' }}>Tier Quantity</th>
                        <th style={{ padding: '0.4rem 0', color: '#166534' }}>Unit Price</th>
                        <th style={{ padding: '0.4rem 0', color: '#166534' }}>Discount Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.tiers.map((t) => {
                        const savingsBps = Math.round(
                          ((product.basePrice - t.unitPrice) / product.basePrice) * 100
                        );
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid #dcfce7' }}>
                            <td style={{ padding: '0.4rem 0', fontWeight: 600 }}>{t.minQty}+ pcs</td>
                            <td style={{ padding: '0.4rem 0', fontWeight: 700, color: '#15803d' }}>
                              {formatBDT(t.unitPrice)} / pc
                            </td>
                            <td style={{ padding: '0.4rem 0', color: '#166534' }}>
                              {savingsBps > 0 ? `${savingsBps}% savings` : 'Base Wholesale'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Product Description
              </h2>
              <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line' }}>
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
