import { redirect } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { SellerNav } from '@/components/seller/seller-nav';
import { ProductForm } from '@/components/seller/product-form';
import { requireRole } from '@/lib/auth/require-role';
import { getSellerByUserId } from '@/server/services/seller.service';
import { getCategories } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
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

  const categories = await getCategories();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
            Create New Product Listing
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Add a new product draft to your store catalog with variants and B2B terms
          </p>
        </div>

        <SellerNav activeTab="new" />

        <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.nameEn }))} />
      </main>
    </div>
  );
}
