import { notFound } from 'next/navigation';
import ProductsPage from '@/app/products/page';
import { getCategoryBySlug } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    seller?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'title_asc';
    page?: string;
    limit?: string;
  }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;

  // Delegate to products page with category fixed to slug
  const mergedSearchParams = Promise.resolve({
    ...resolvedSearchParams,
    category: slug,
  });

  return <ProductsPage searchParams={mergedSearchParams} />;
}
