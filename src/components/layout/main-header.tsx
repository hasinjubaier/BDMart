import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { LogoutButton } from '@/components/auth/logout-button';

export async function MainHeader() {
  const user = await getSessionUser().catch(() => null);

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#153b5b',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>BD</span>
            <span style={{ color: '#16a36a' }}>Mart</span>
          </Link>

          <nav
            aria-label="Primary"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
          >
            <Link
              href="/products"
              style={{
                textDecoration: 'none',
                color: '#334155',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              All Products
            </Link>
          </nav>
        </div>

        {/* Global Search Bar */}
        <form
          action="/products"
          method="GET"
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 280px',
            maxWidth: '480px',
            position: 'relative',
          }}
          role="search"
        >
          <input
            type="search"
            name="q"
            placeholder="Search by product title or SKU (e.g. SKU-JUTE-BAG-001)..."
            aria-label="Search catalog by title or SKU"
            style={{
              width: '100%',
              padding: '0.5rem 2.5rem 0.5rem 0.85rem',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
          <button
            type="submit"
            aria-label="Submit search"
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#153b5b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            🔍
          </button>
        </form>

        {/* User Navigation & Portals */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user?.role === 'seller' && (
            <Link
              href="/seller/products"
              style={{
                textDecoration: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid #a7f3d0',
              }}
            >
              Seller Workspace
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              href="/admin/moderation"
              style={{
                textDecoration: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid #bfdbfe',
              }}
            >
              Admin Moderation
            </Link>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={user.name}
              >
                {user.name}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#16a36a',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
