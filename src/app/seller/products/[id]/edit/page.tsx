import { redirect, notFound } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { SellerNav } from '@/components/seller/seller-nav';
import { ProductForm } from '@/components/seller/product-form';
import { requireRole } from '@/lib/auth/require-role';
import { getSellerByUserId, getSellerProductById } from '@/server/services/seller.service';
import { getCategories } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

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

  const [product, categories] = await Promise.all([
    getSellerProductById(seller.id, id),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
            Edit Product Listing
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Update product attributes, prices, and address any moderation feedback
          </p>
        </div>

        <SellerNav activeTab="products" />

        <ProductForm
          isEdit={true}
          categories={categories.map((c) => ({ id: c.id, name: c.nameEn }))}
          initialData={{
            id: product.id,
            title: product.title,
            description: product.description,
            categoryId: product.categoryId,
            basePriceBdt: product.basePrice / 100,
            moq: product.moq,
            isB2bEnabled: product.isB2bEnabled,
            images: product.images.map((img) => img.storagePath),
            variants: product.variants,
            tiers: product.tiers,
            moderationReason: product.moderationReason,
          }}
        />
      </main>
    </div>
  );
}
