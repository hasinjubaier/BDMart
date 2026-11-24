'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

interface CategoryOption {
  slug: string;
  name: string;
}

interface FiltersBarProps {
  categories: CategoryOption[];
  currentCategory?: string;
  currentSort?: string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentInStock?: boolean;
  currentQ?: string;
}

export function FiltersBar({
  categories,
  currentCategory = '',
  currentSort = 'newest',
  currentMinPrice,
  currentMaxPrice,
  currentInStock = false,
  currentQ = '',
}: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState(currentCategory);
  const [minPrice, setMinPrice] = useState(currentMinPrice !== undefined ? String(currentMinPrice) : '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice !== undefined ? String(currentMaxPrice) : '');
  const [inStock, setInStock] = useState(currentInStock);
  const [sort, setSort] = useState(currentSort);
  const [searchQuery, setSearchQuery] = useState(currentQ);

  const applyFilters = (overrides?: {
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: boolean;
    sort?: string;
    q?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset pagination to page 1 on filter modification
    params.delete('page');

    const catVal = overrides?.category !== undefined ? overrides.category : category;
    if (catVal) params.set('category', catVal);
    else params.delete('category');

    const qVal = overrides?.q !== undefined ? overrides.q : searchQuery;
    if (qVal) params.set('q', qVal);
    else params.delete('q');

    const minVal = overrides?.minPrice !== undefined ? overrides.minPrice : minPrice;
    if (minVal && !isNaN(Number(minVal))) params.set('minPrice', minVal);
    else params.delete('minPrice');

    const maxVal = overrides?.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
    if (maxVal && !isNaN(Number(maxVal))) params.set('maxPrice', maxVal);
    else params.delete('maxPrice');

    const inStockVal = overrides?.inStock !== undefined ? overrides.inStock : inStock;
    if (inStockVal) params.set('inStock', 'true');
    else params.delete('inStock');

    const sortVal = overrides?.sort !== undefined ? overrides.sort : sort;
    if (sortVal && sortVal !== 'newest') params.set('sort', sortVal);
    else params.delete('sort');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSort('newest');
    setSearchQuery('');

    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    category || minPrice || maxPrice || inStock || (sort && sort !== 'newest') || searchQuery
  );

  return (
    <aside
      aria-label="Product Filters"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#153b5b' }}>
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.2rem 0.4rem',
            }}
          >
            Reset All
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Keyword Search */}
        <div>
          <label
            htmlFor="filter-search-input"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}
          >
            Search Keyword / SKU
          </label>
          <input
            id="filter-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Title or SKU..."
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Category Filter */}
        <div>
          <label
            htmlFor="filter-category-select"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}
          >
            Category
          </label>
          <select
            id="filter-category-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              applyFilters({ category: e.target.value });
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter (in BDT) */}
        <div>
          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
            Price Range (BDT)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Minimum price in BDT"
              min="0"
              style={{
                width: '50%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Maximum price in BDT"
              min="0"
              style={{
                width: '50%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* In-Stock Only Toggle */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#1e293b',
            }}
          >
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => {
                setInStock(e.target.checked);
                applyFilters({ inStock: e.target.checked });
              }}
              style={{ width: '16px', height: '16px', accentColor: '#16a36a' }}
            />
            <span>In Stock Only</span>
          </label>
        </div>

        {/* Sort Order */}
        <div>
          <label
            htmlFor="filter-sort-select"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}
          >
            Sort By
          </label>
          <select
            id="filter-sort-select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="title_asc">Title: A-Z</option>
          </select>
        </div>

        {/* Action button */}
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: '#153b5b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Applying...' : 'Apply Filters'}
        </button>
      </form>
    </aside>
  );
}
