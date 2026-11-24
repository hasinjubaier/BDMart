import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { SellerNav } from '@/components/seller/seller-nav';
import { requireRole } from '@/lib/auth/require-role';
import { formatBDT } from '@/lib/formatters';
import { getSellerByUserId, getSellerProducts } from '@/server/services/seller.service';
import { SafeImage } from '@/components/ui/safe-image';
export const dynamic = 'force-dynamic';

interface SellerProductsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function SellerProductsPage({ searchParams }: SellerProductsPageProps) {
  let user;
  try {
    user = await requireRole(['seller']);
  } catch {
    redirect('/login');
  }

  const seller = await getSellerByUserId(user.id);
  if (!seller) {
    redirect('/');
  }

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || 'all';

  const products = await getSellerProducts(seller.id, statusFilter);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    returned: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    active: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        {/* Workspace Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
              Seller Workspace: {seller.shopName}
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Manage your product catalog, submission workflows, and inventory
            </p>
          </div>

          <Link
            href="/seller/products/new"
            data-testid="create-new-product-link"
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#16a36a',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(22, 163, 106, 0.2)',
            }}
          >
            + Create New Listing
          </Link>
        </div>

        <SellerNav activeTab="products" />

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['all', 'draft', 'pending', 'returned', 'active'].map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <Link
                key={tab}
                href={tab === 'all' ? '/seller/products' : `/seller/products?status=${tab}`}
                style={{
                  textDecoration: 'none',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  backgroundColor: isActive ? '#153b5b' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: `1px solid ${isActive ? '#153b5b' : '#cbd5e1'}`,
                }}
              >
                {tab}
              </Link>
            );
          })}
        </div>

        {/* Product Listings Table */}
        {products.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem 1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#153b5b', margin: '0 0 0.5rem 0' }}>
              No Products Found
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              You don&apos;t have any products in this status tab yet. Start by creating your first product listing.
            </p>
            <Link
              href="/seller/products/new"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                backgroundColor: '#16a36a',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              + Create New Listing
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {products.map((p) => {
              const colors = statusColors[p.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

              return (
                <div
                  key={p.id}
                  data-testid={`seller-product-row-${p.id}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          flexShrink: 0,
                        }}
                      >
                        <SafeImage
                          src={p.primaryImage}
                          alt={p.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span
                            data-testid={`product-status-pill-${p.id}`}
                            style={{
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {p.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {p.categoryName}
                          </span>
                        </div>

                        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
                          {p.title}
                        </h2>

                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                          <span>
                            Retail: <strong>{formatBDT(p.basePrice)}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Total Stock: <strong>{p.totalStock} units</strong>
                          </span>
                          <span>&bull;</span>
                          <span>Variants: <strong>{p.variantCount}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {p.status === 'active' && (
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#153b5b',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          View in Store ↗
                        </Link>
                      )}

                      {(p.status === 'draft' || p.status === 'returned') && (
                        <Link
                          href={`/seller/products/${p.id}/edit`}
                          data-testid={`edit-product-btn-${p.id}`}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: p.status === 'returned' ? '#fee2e2' : '#f1f5f9',
                            color: p.status === 'returned' ? '#991b1b' : '#153b5b',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: `1px solid ${p.status === 'returned' ? '#fca5a5' : '#cbd5e1'}`,
                          }}
                        >
                          {p.status === 'returned' ? 'Edit & Resubmit' : 'Edit Draft'}
                        </Link>
                      )}

                      {p.status === 'active' && (
                        <Link
                          href="/seller/inventory"
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: '1px solid #86efac',
                          }}
                        >
                          Adjust Stock
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Prominent Moderation Reason Alert if Returned */}
                  {p.status === 'returned' && p.moderationReason && (
                    <div
                      data-testid={`returned-reason-box-${p.id}`}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        fontSize: '0.85rem',
                        color: '#991b1b',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                        Moderator Return Reason:
                      </strong>
                      <span>{p.moderationReason}</span>
                    </div>
                  )}

                  {/* Variants Snippet */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f8fafc' }}>
                    {p.variants.map((v) => (
                      <span
                        key={v.id}
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          backgroundColor: '#f8fafc',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                        }}
                      >
                        {v.sku}: <strong>{v.stock} pcs</strong> ({formatBDT(v.price)})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
