import Link from 'next/link';
import { MainHeader } from '@/components/layout/main-header';
import { ProductCard } from '@/components/catalog/product-card';
import { FiltersBar } from '@/components/catalog/filters-bar';
import { Pagination } from '@/components/catalog/pagination';
import { getCategories, searchCatalog } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    seller?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'title_asc';
    page?: string;
    limit?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;

  const minPriceNum = resolvedParams.minPrice ? parseFloat(resolvedParams.minPrice) : undefined;
  const maxPriceNum = resolvedParams.maxPrice ? parseFloat(resolvedParams.maxPrice) : undefined;
  const inStockBool = resolvedParams.inStock === 'true' ? true : resolvedParams.inStock === 'false' ? false : undefined;
  const pageNum = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const [categories, catalogResult] = await Promise.all([
    getCategories(),
    searchCatalog({
      q: resolvedParams.q,
      category: resolvedParams.category,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      inStock: inStockBool,
      seller: resolvedParams.seller,
      sort: resolvedParams.sort || 'newest',
      page: pageNum,
      limit: 12,
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === resolvedParams.category);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 3rem' }}>
        {/* Breadcrumb Header */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          <Link href="/" style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          {activeCategory ? (
            <>
              <Link href="/products" style={{ color: '#153b5b', textDecoration: 'none', fontWeight: 500 }}>Products</Link>
              <span style={{ margin: '0 0.5rem' }}>/</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{activeCategory.nameEn}</span>
            </>
          ) : (
            <span style={{ color: '#0f172a', fontWeight: 600 }}>All Products</span>
          )}
        </nav>

        {/* Page Title & Result Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#153b5b', margin: '0 0 0.25rem 0' }}>
              {activeCategory ? activeCategory.nameEn : 'Marketplace Catalog'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              {resolvedParams.q ? (
                <>Showing results for search term &ldquo;<strong>{resolvedParams.q}</strong>&rdquo; &bull; {catalogResult.total} items</>
              ) : (
                <>Showing {catalogResult.total} verified products in stock and available for delivery</>
              )}
            </p>
          </div>
        </div>

        {/* Main Content Layout: Sidebar Filters + Products Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 280px) 1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
          className="catalog-grid-layout"
        >
          {/* Filters Sidebar */}
          <FiltersBar
            categories={categories.map((c) => ({ slug: c.slug, name: c.nameEn }))}
            currentCategory={resolvedParams.category}
            currentSort={resolvedParams.sort}
            currentMinPrice={minPriceNum}
            currentMaxPrice={maxPriceNum}
            currentInStock={inStockBool}
            currentQ={resolvedParams.q}
          />

          {/* Product Feed */}
          <section aria-label="Product Search Results">
            {catalogResult.items.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#153b5b', margin: '0 0 0.5rem 0' }}>
                  No Products Found
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  We couldn&apos;t find any active products matching your filters. Try clearing your search keyword or expanding your price range.
                </p>
                <Link
                  href="/products"
                  style={{
                    display: 'inline-block',
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#153b5b',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Clear All Filters
                </Link>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {catalogResult.items.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>

                {/* Stable Pagination */}
                <Pagination
                  currentPage={catalogResult.page}
                  totalPages={catalogResult.totalPages}
                  searchParams={resolvedParams}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
