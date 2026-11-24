import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { requireRole } from '@/lib/auth/require-role';
import { getModerationQueue } from '@/server/services/moderation.service';
import { formatBDT } from '@/lib/formatters';
import { SafeImage } from '@/components/ui/safe-image';

export const dynamic = 'force-dynamic';

interface AdminModerationPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminModerationPage({ searchParams }: AdminModerationPageProps) {
  try {
    await requireRole(['admin']);
  } catch {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || 'pending';

  const queueItems = await getModerationQueue(statusFilter);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    returned: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    active: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
              Catalog Moderation Queue
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Review pending product submissions, enforce Bangladesh Digital Commerce guidelines, and manage catalog publication
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'pending', label: 'Pending Review' },
            { id: 'returned', label: 'Returned to Seller' },
            { id: 'active', label: 'Published / Active' },
            { id: 'all', label: 'All Submissions' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/admin/moderation?status=${tab.id}`}
                style={{
                  textDecoration: 'none',
                  padding: '0.4rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: isActive ? '#153b5b' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: `1px solid ${isActive ? '#153b5b' : '#cbd5e1'}`,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Moderation Items Table */}
        {queueItems.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem 1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#153b5b', margin: '0 0 0.5rem 0' }}>
              Moderation Queue Clear
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              There are no submissions currently awaiting review in the &ldquo;{statusFilter}&rdquo; status tab.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {queueItems.map((item) => {
              const colors = statusColors[item.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

              return (
                <div
                  key={item.id}
                  data-testid={`moderation-item-${item.id}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                        src={item.primaryImage}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span
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
                          {item.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.categoryName}
                        </span>
                      </div>

                      <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        {item.title}
                      </h2>

                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                        Seller: <strong>{item.sellerShopName}</strong> ({item.sellerName}) &bull; Retail:{' '}
                        <strong>{formatBDT(item.basePrice)}</strong> &bull; Total Stock: <strong>{item.totalStock} pcs</strong>
                      </p>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/admin/moderation/${item.id}`}
                      data-testid={`review-btn-${item.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#153b5b',
                        color: '#ffffff',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      Review Listing →
                    </Link>
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
