import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { ModerationControls } from '@/components/admin/moderation-controls';
import { requireRole } from '@/lib/auth/require-role';
import { getModerationDetail } from '@/server/services/moderation.service';
import { formatBDT } from '@/lib/formatters';
import { SafeImage } from '@/components/ui/safe-image';

export const dynamic = 'force-dynamic';

interface ModerationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ModerationDetailPage({ params }: ModerationDetailPageProps) {
  const { id } = await params;

  try {
    await requireRole(['admin']);
  } catch {
    redirect('/login');
  }

  const item = await getModerationDetail(id);
  if (!item) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          <Link href="/admin/moderation" style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>
            ← Back to Moderation Queue
          </Link>
        </nav>

        {/* Heading */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Submission Review
            </span>
            <h1 data-testid="moderation-item-title" style={{ margin: '0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
              {item.title}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Category: <strong>{item.categoryName}</strong> &bull; Submitted by <strong>{item.sellerShopName}</strong>
            </p>
          </div>
        </div>

        {/* Two-Column Inspection Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Product & Variants Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Seller Profile Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
                Seller Information
              </h2>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
                <li>Shop: <strong>{item.sellerShopName}</strong></li>
                <li>Merchant: <strong>{item.sellerName}</strong></li>
                <li>Phone: <strong>{item.sellerPhone}</strong></li>
                <li>Email: <strong>{item.sellerEmail || 'N/A'}</strong></li>
                <li>
                  KYC Verification:{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: item.sellerKycStatus === 'approved' ? '#dcfce7' : '#fef3c7',
                      color: item.sellerKycStatus === 'approved' ? '#166534' : '#92400e',
                    }}
                  >
                    {item.sellerKycStatus}
                  </span>
                </li>
              </ul>
            </div>

            {/* Product Images */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
                Product Images ({item.images.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {item.images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <SafeImage
                      src={img.storagePath}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Variants Table */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
                Variants & Pricing ({item.variants.length})
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '0.5rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem' }}>Attributes</th>
                      <th style={{ padding: '0.5rem' }}>Stock</th>
                      <th style={{ padding: '0.5rem' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.variants.map((v) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>{v.sku}</td>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>
                          {JSON.stringify(v.attributes)}
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: 700 }}>{v.stock} pcs</td>
                        <td style={{ padding: '0.5rem', color: '#16a36a', fontWeight: 700 }}>
                          {formatBDT(v.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Description */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
                Description
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line' }}>
                {item.description}
              </p>
            </div>
          </div>

          {/* Right Column: Moderation Decision Controls & Audit Trail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Moderation Controls Card */}
            <ModerationControls productId={item.id} currentStatus={item.status} />

            {/* Historical Audit Trail */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#153b5b' }}>
                Submission Audit Trail
              </h3>

              {item.auditTrail.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  No historical moderation events recorded yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {item.auditTrail.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                        <span style={{ color: '#94a3b8' }}>
                          {new Date(log.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {(log.meta as { reason?: string })?.reason && (
                        <p style={{ margin: '0.25rem 0 0 0', color: '#991b1b' }}>
                          Reason: {(log.meta as { reason?: string }).reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
