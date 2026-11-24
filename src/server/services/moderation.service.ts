import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  products,
  sellers,
  users,
  categories,
  productVariants,
  productImages,
  priceTiers,
  auditLogs,
} from '@/db/schema';
import { logAuditEvent } from './audit.service';

export class ModerationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'MODERATION_ERROR'
  ) {
    super(message);
    this.name = 'ModerationError';
  }
}

/**
 * Lists listings in the administrative moderation queue.
 */
export async function getModerationQueue(statusFilter: string = 'pending') {
  const db = getDb();
  const conditions = [];

  if (statusFilter !== 'all') {
    conditions.push(eq(products.status, statusFilter));
  }

  const items = await db
    .select({
      id: products.id,
      slug: products.slug,
      titleEn: products.titleEn,
      titleBn: products.titleBn,
      status: products.status,
      basePrice: products.basePrice,
      moq: products.moq,
      isB2bEnabled: products.isB2bEnabled,
      categoryId: products.categoryId,
      categoryName: categories.nameEn,
      sellerId: products.sellerId,
      sellerShopName: sellers.shopName,
      sellerKycStatus: sellers.kycStatus,
      sellerName: users.name,
      sellerPhone: users.phone,
      sellerEmail: users.email,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.updatedAt));

  if (items.length === 0) return [];

  const productIds = items.map((p) => p.id);

  const [variants, images] = await Promise.all([
    db
      .select({
        productId: productVariants.productId,
        sku: productVariants.sku,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds)),
    db
      .select({
        productId: productImages.productId,
        storagePath: productImages.storagePath,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
  ]);

  return items.map((p) => {
    const prodVariants = variants.filter((v) => v.productId === p.id);
    const prodImages = images.filter((img) => img.productId === p.id);
    const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);

    return {
      ...p,
      title: p.titleEn || p.titleBn,
      basePrice: Number(p.basePrice),
      variantCount: prodVariants.length,
      totalStock,
      imageCount: prodImages.length,
      primaryImage: prodImages[0]?.storagePath || '/placeholder-product.svg',
    };
  });
}

/**
 * Retrieves full detail of a product for admin moderation inspection.
 */
export async function getModerationDetail(productId: string) {
  const db = getDb();

  const [item] = await db
    .select({
      id: products.id,
      slug: products.slug,
      titleEn: products.titleEn,
      titleBn: products.titleBn,
      description: products.description,
      status: products.status,
      basePrice: products.basePrice,
      moq: products.moq,
      isB2bEnabled: products.isB2bEnabled,
      categoryId: products.categoryId,
      categoryName: categories.nameEn,
      sellerId: products.sellerId,
      sellerShopName: sellers.shopName,
      sellerKycStatus: sellers.kycStatus,
      sellerUserId: sellers.userId,
      sellerName: users.name,
      sellerPhone: users.phone,
      sellerEmail: users.email,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(eq(products.id, productId))
    .limit(1);

  if (!item) return null;

  const [variants, images, tiers, auditTrail] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        attributes: productVariants.attributes,
        stock: productVariants.stock,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, item.id)),
    db
      .select({
        id: productImages.id,
        storagePath: productImages.storagePath,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(eq(productImages.productId, item.id))
      .orderBy(productImages.sort),
    db
      .select({
        id: priceTiers.id,
        minQty: priceTiers.minQty,
        unitPrice: priceTiers.unitPrice,
      })
      .from(priceTiers)
      .where(eq(priceTiers.productId, item.id))
      .orderBy(priceTiers.minQty),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorId: auditLogs.actorId,
        meta: auditLogs.meta,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, 'products'), eq(auditLogs.entityId, item.id)))
      .orderBy(desc(auditLogs.createdAt)),
  ]);

  return {
    ...item,
    title: item.titleEn || item.titleBn,
    basePrice: Number(item.basePrice),
    variants: variants.map((v) => ({ ...v, price: Number(v.price) })),
    images,
    tiers: tiers.map((t) => ({ ...t, unitPrice: Number(t.unitPrice) })),
    auditTrail,
  };
}

/**
 * Publishes a pending listing, moving it to 'active'.
 * Idempotent: If already active, does not fail and leaves the state consistent.
 */
export async function publishProduct(adminUserId: string, productId: string) {
  const db = getDb();

  const [item] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!item) {
    throw new ModerationError('Product not found.', 404, 'NOT_FOUND');
  }

  // Idempotency: if already active, return success
  if (item.status === 'active') {
    return { productId, status: 'active', idempotent: true };
  }

  if (item.status !== 'pending') {
    throw new ModerationError(
      `Cannot publish product in status '${item.status}'. Only 'pending' products can be published.`,
      400,
      'INVALID_TRANSITION'
    );
  }

  await db
    .update(products)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await logAuditEvent({
    actorId: adminUserId,
    action: 'PRODUCT_PUBLISHED',
    entity: 'products',
    entityId: productId,
    meta: {
      previousStatus: item.status,
      newStatus: 'active',
      publishedAt: new Date().toISOString(),
    },
  });

  return { productId, status: 'active' };
}

/**
 * Returns a pending listing to the seller with a documented rejection/change reason.
 * Idempotent: If already returned, updates the reason and maintains consistent state.
 */
export async function returnProduct(adminUserId: string, productId: string, reason: string) {
  if (!reason || reason.trim().length < 3) {
    throw new ModerationError('A detailed reason is required to return a submission.', 400, 'MISSING_REASON');
  }

  const db = getDb();

  const [item] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!item) {
    throw new ModerationError('Product not found.', 404, 'NOT_FOUND');
  }

  // Idempotency: if already returned, record updated reason and return
  if (item.status === 'returned') {
    await logAuditEvent({
      actorId: adminUserId,
      action: 'PRODUCT_RETURNED',
      entity: 'products',
      entityId: productId,
      meta: {
        reason,
        previousStatus: 'returned',
        newStatus: 'returned',
        idempotent: true,
      },
    });
    return { productId, status: 'returned', idempotent: true };
  }

  if (item.status !== 'pending') {
    throw new ModerationError(
      `Cannot return product in status '${item.status}'. Only 'pending' products can be returned.`,
      400,
      'INVALID_TRANSITION'
    );
  }

  await db
    .update(products)
    .set({
      status: 'returned',
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await logAuditEvent({
    actorId: adminUserId,
    action: 'PRODUCT_RETURNED',
    entity: 'products',
    entityId: productId,
    meta: {
      reason,
      previousStatus: item.status,
      newStatus: 'returned',
      returnedAt: new Date().toISOString(),
    },
  });

  return { productId, status: 'returned' };
}
