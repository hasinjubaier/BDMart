import { redirect } from 'next/navigation';
import { MainHeader } from '@/components/layout/main-header';
import { SellerNav } from '@/components/seller/seller-nav';
import { InventoryTable, type InventoryItem } from '@/components/seller/inventory-table';
import { requireRole } from '@/lib/auth/require-role';
import { getSellerByUserId } from '@/server/services/seller.service';
import { getDb } from '@/db';
import { products, productVariants } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function SellerInventoryPage() {
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

  const db = getDb();

  // Fetch all variants for products owned by this seller
  const rows = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      stock: productVariants.stock,
      price: productVariants.price,
      attributes: productVariants.attributes,
      productTitle: products.titleEn,
      productSlug: products.slug,
      productStatus: products.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(products.sellerId, seller.id))
    .orderBy(asc(productVariants.sku));

  const items: InventoryItem[] = rows.map((r) => ({
    variantId: r.variantId,
    sku: r.sku,
    productTitle: r.productTitle,
    productSlug: r.productSlug,
    productStatus: r.productStatus,
    stock: r.stock,
    price: Number(r.price),
    attributes: r.attributes as Record<string, unknown>,
  }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9ff' }}>
      <MainHeader />

      <main style={{ flex: '1 0 auto', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#153b5b' }}>
            Inventory Management
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Real-time stock balance controls and audit-logged quantity adjustments
          </p>
        </div>

        <SellerNav activeTab="inventory" />

        <InventoryTable items={items} />
      </main>
    </div>
  );
}
