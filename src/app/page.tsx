import Link from 'next/link';
import { MainHeader } from '@/components/layout/main-header';
import { ProductCard } from '@/components/catalog/product-card';
import { getCategories, searchCatalog } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    searchCatalog({ limit: 8, sort: 'newest' }),
  ]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto' }}>
        {/* Hero Section */}
        <section
          style={{
            backgroundColor: '#153b5b',
            color: '#ffffff',
            padding: '3.5rem 1rem 3rem',
            textAlign: 'center',
            backgroundImage: 'radial-gradient(ellipse at top, #1e4d75 0%, #153b5b 100%)',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.3rem 0.85rem',
                backgroundColor: 'rgba(22, 163, 106, 0.25)',
                color: '#4ade80',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '1rem',
                border: '1px solid rgba(74, 222, 128, 0.3)',
              }}
            >
              Bangladesh&apos;s Trusted Marketplace • Retail & B2B Wholesale
            </span>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
                fontWeight: 800,
                lineHeight: 1.2,
                margin: '0 0 1rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              Authentic Local Products, Verified Sellers
            </h1>
            <p
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
                color: '#cbd5e1',
                margin: '0 0 2rem 0',
                lineHeight: 1.5,
              }}
            >
              Shop premium handcrafted jute, authentic Jamdani silk, organic food essentials, and industrial supplies with transparent BDT pricing.
            </p>

            {/* Fast Search Hero Form */}
            <form
              action="/products"
              method="GET"
              style={{
                maxWidth: '600px',
                margin: '0 auto',
                display: 'flex',
                gap: '0.5rem',
                backgroundColor: '#ffffff',
                padding: '0.35rem',
                borderRadius: '9999px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
              role="search"
            >
              <input
                type="search"
                name="q"
                placeholder="Search products, categories, or exact SKU..."
                aria-label="Search catalog by title or SKU"
                style={{
                  flex: '1 1 auto',
                  border: 'none',
                  outline: 'none',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.95rem',
                  borderRadius: '9999px',
                  color: '#0f172a',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#16a36a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Categories Explorer Section */}
        <section style={{ maxWidth: '1200px', margin: '2rem auto 0', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#153b5b', margin: 0 }}>
              Browse by Category
            </h2>
            <Link
              href="/products"
              style={{ color: '#16a36a', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
            >
              View All Categories →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#153b5b' }}>
                  {cat.nameEn}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Explore Feed</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Active Products Grid */}
        <section style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#153b5b', margin: '0 0 0.25rem 0' }}>
                Featured Catalog Products
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Verified listings currently active in the marketplace
              </p>
            </div>
            <Link
              href="/products"
              style={{ color: '#16a36a', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
            >
              Browse Full Catalog ({featuredProducts.total}) →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {featuredProducts.items.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>

        {/* B2B Wholesale Callout Banner */}
        <section
          style={{
            maxWidth: '1200px',
            margin: '0 auto 4rem',
            padding: '0 1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#1d4ed8',
                  letterSpacing: '0.05em',
                }}
              >
                B2B Bulk Inquiries
              </span>
              <h3 style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                Procuring for your business or corporate gifting?
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#3b82f6', lineHeight: 1.5 }}>
                BD Mart offers tiered volume pricing ladders, transparent MOQs, and proforma tax invoices for registered business buyers.
              </p>
            </div>
            <Link
              href="/products"
              style={{
                backgroundColor: '#153b5b',
                color: '#ffffff',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Explore Wholesale Items
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '2rem 1rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#153b5b' }}>
            BD Mart — Bangladesh Digital Commerce Guidelines (2021) Compliant
          </p>
          <p style={{ margin: 0 }}>
            Integer-poisha financial precision • Escrow protected • All prices in Bangladeshi Taka (BDT)
          </p>
        </div>
      </footer>
    </div>
  );
}
