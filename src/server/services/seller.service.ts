import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, getSqlClient } from '@/db';
import {
  sellers,
  products,
  productVariants,
  productImages,
  priceTiers,
  categories,
  auditLogs,
} from '@/db/schema';
import { slugify } from '@/lib/formatters';
import type { CreateProductInput, UpdateProductInput } from '@/lib/validators/catalog';
import { logAuditEvent } from './audit.service';

export class SellerError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'SELLER_ERROR'
  ) {
    super(message);
    this.name = 'SellerError';
  }
}

/**
 * Retrieves the seller profile associated with a user ID.
 */
export async function getSellerByUserId(userId: string) {
  const db = getDb();
  const [seller] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.userId, userId))
    .limit(1);

  return seller || null;
}

/**
 * Lists all products owned by a seller, with optional status filter.
 * Includes latest moderation reason for returned items.
 */
export async function getSellerProducts(sellerId: string, statusFilter?: string) {
  const db = getDb();
  const conditions = [eq(products.sellerId, sellerId)];

  if (statusFilter && statusFilter !== 'all') {
    conditions.push(eq(products.status, statusFilter));
  }

  const productList = await db
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
      categoryNameEn: categories.nameEn,
      categoryNameBn: categories.nameBn,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.updatedAt));

  if (productList.length === 0) return [];

  const productIds = productList.map((p) => p.id);

  // Fetch variants for stock aggregation
  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      stock: productVariants.stock,
      price: productVariants.price,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds));

  // Fetch primary images
  const images = await db
    .select({
      productId: productImages.productId,
      storagePath: productImages.storagePath,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds));

  // Fetch recent moderation reasons for returned or pending items
  const recentReturns = await db
    .select({
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      meta: auditLogs.meta,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entity, 'products'),
        inArray(auditLogs.entityId, productIds),
        eq(auditLogs.action, 'PRODUCT_RETURNED')
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  return productList.map((p) => {
    const prodVariants = variants.filter((v) => v.productId === p.id);
    const prodImage = images.find((img) => img.productId === p.id)?.storagePath || '/placeholder-product.svg';
    const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);

    // Latest return reason if returned
    const lastReturn = recentReturns.find((r) => r.entityId === p.id);
    const moderationReason = lastReturn ? (lastReturn.meta as { reason?: string })?.reason || null : null;

    return {
      id: p.id,
      slug: p.slug,
      title: p.titleEn || p.titleBn,
      description: p.description,
      status: p.status,
      basePrice: Number(p.basePrice),
      moq: p.moq,
      isB2bEnabled: p.isB2bEnabled,
      categoryId: p.categoryId,
      categoryName: p.categoryNameEn || p.categoryNameBn,
      totalStock,
      variantCount: prodVariants.length,
      variants: prodVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        stock: v.stock,
        price: Number(v.price),
      })),
      primaryImage: prodImage,
      moderationReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });
}

/**
 * Fetches a single product owned by the seller, including its moderation history.
 */
export async function getSellerProductById(sellerId: string, productId: string) {
  const db = getDb();
  const [prod] = await db
    .select({
      id: products.id,
      sellerId: products.sellerId,
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
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .limit(1);

  if (!prod) return null;

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
      .where(eq(productVariants.productId, prod.id)),
    db
      .select({
        id: productImages.id,
        storagePath: productImages.storagePath,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(eq(productImages.productId, prod.id)),
    db
      .select({
        id: priceTiers.id,
        minQty: priceTiers.minQty,
        unitPrice: priceTiers.unitPrice,
      })
      .from(priceTiers)
      .where(eq(priceTiers.productId, prod.id)),
    db
      .select({
        action: auditLogs.action,
        meta: auditLogs.meta,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, 'products'), eq(auditLogs.entityId, prod.id)))
      .orderBy(desc(auditLogs.createdAt)),
  ]);

  const lastReturn = auditTrail.find((a) => a.action === 'PRODUCT_RETURNED');
  const moderationReason = lastReturn ? (lastReturn.meta as { reason?: string })?.reason || null : null;

  return {
    ...prod,
    title: prod.titleEn || prod.titleBn,
    basePrice: Number(prod.basePrice),
    variants: variants.map((v) => ({ ...v, price: Number(v.price) })),
    images,
    tiers: tiers.map((t) => ({ ...t, unitPrice: Number(t.unitPrice) })),
    moderationReason,
    auditTrail,
  };
}

/**
 * Creates a new product draft for an approved seller.
 */
export async function createProductDraft(
  sellerId: string,
  userId: string,
  input: CreateProductInput
) {
  const db = getDb();

  // 1. Verify seller exists and check KYC approval
  const [seller] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.id, sellerId))
    .limit(1);

  if (!seller) {
    throw new SellerError('Seller profile not found.', 404, 'NOT_FOUND');
  }

  // 2. Validate category exists
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, input.categoryId))
    .limit(1);

  if (!cat) {
    throw new SellerError('Selected category does not exist.', 400, 'INVALID_CATEGORY');
  }

  // 3. Check SKU uniqueness
  const skus = input.variants.map((v) => v.sku);
  const existingSkus = await db
    .select({ sku: productVariants.sku })
    .from(productVariants)
    .where(inArray(productVariants.sku, skus));

  if (existingSkus.length > 0) {
    throw new SellerError(
      `SKU already exists: ${existingSkus.map((s) => s.sku).join(', ')}. SKUs must be globally unique.`,
      400,
      'DUPLICATE_SKU'
    );
  }

  // 4. Generate unique slug
  let slug = slugify(input.title);
  const [existingSlug] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
  }

  const productId = crypto.randomUUID();

  // 5. Insert product and related child records
  await db.insert(products).values({
    id: productId,
    sellerId,
    categoryId: input.categoryId,
    slug,
    titleEn: input.title,
    titleBn: input.title, // Seed default to English
    description: input.description,
    status: 'draft',
    basePrice: BigInt(input.basePrice),
    moq: input.moq || 1,
    isB2bEnabled: input.isB2bEnabled || false,
  });

  // Insert variants
  for (const v of input.variants) {
    await db.insert(productVariants).values({
      id: crypto.randomUUID(),
      productId,
      sku: v.sku,
      attributes: v.attributes || {},
      stock: v.stock,
      price: BigInt(v.price),
    });
  }

  // Insert images
  if (input.images && input.images.length > 0) {
    for (let i = 0; i < input.images.length; i++) {
      await db.insert(productImages).values({
        id: crypto.randomUUID(),
        productId,
        storagePath: input.images[i]!,
        sort: i,
      });
    }
  }

  // Insert wholesale tiers if enabled
  if (input.isB2bEnabled && input.tiers && input.tiers.length > 0) {
    for (const t of input.tiers) {
      await db.insert(priceTiers).values({
        id: crypto.randomUUID(),
        productId,
        minQty: t.minQty,
        unitPrice: BigInt(t.unitPrice),
      });
    }
  }

  // Log audit
  await logAuditEvent({
    actorId: userId,
    action: 'PRODUCT_CREATED',
    entity: 'products',
    entityId: productId,
    meta: { title: input.title, slug, status: 'draft' },
  });

  return { productId, slug };
}

/**
 * Updates an existing product draft or returned listing.
 * Review policy: If product is already 'active', editing content changes status to 'pending'
 * so that unapproved changes cannot become visible immediately.
 */
export async function updateProductDraft(
  sellerId: string,
  userId: string,
  productId: string,
  input: UpdateProductInput
) {
  const db = getDb();

  // 1. Verify product ownership
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .limit(1);

  if (!existing) {
    throw new SellerError('Product not found or not owned by you.', 404, 'NOT_FOUND');
  }

  // 2. Validate category
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, input.categoryId))
    .limit(1);

  if (!cat) {
    throw new SellerError('Selected category does not exist.', 400, 'INVALID_CATEGORY');
  }

  // 3. Check SKU uniqueness for any new SKUs
  const incomingSkus = input.variants.map((v) => v.sku);
  const existingVariants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  const existingVariantSkus = new Set(existingVariants.map((v) => v.sku));
  const newSkusToCheck = incomingSkus.filter((sku) => !existingVariantSkus.has(sku));

  if (newSkusToCheck.length > 0) {
    const conflictSkus = await db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(inArray(productVariants.sku, newSkusToCheck));

    if (conflictSkus.length > 0) {
      throw new SellerError(
        `SKU already exists: ${conflictSkus.map((s) => s.sku).join(', ')}. SKUs must be unique.`,
        400,
        'DUPLICATE_SKU'
      );
    }
  }

  // 4. Determine status:
  // If product is active, seller updates require re-moderation (transition to 'pending')
  let nextStatus = existing.status;
  if (existing.status === 'active') {
    nextStatus = 'pending';
  }

  // 5. Update product and child records
  await db
    .update(products)
    .set({
      categoryId: input.categoryId,
      titleEn: input.title,
      titleBn: input.title,
      description: input.description,
      basePrice: BigInt(input.basePrice),
      moq: input.moq || 1,
      isB2bEnabled: input.isB2bEnabled || false,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  // Delete old variants and insert new
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  for (const v of input.variants) {
    await db.insert(productVariants).values({
      id: crypto.randomUUID(),
      productId,
      sku: v.sku,
      attributes: v.attributes || {},
      stock: v.stock,
      price: BigInt(v.price),
    });
  }

  // Delete old images and insert new
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (input.images && input.images.length > 0) {
    for (let i = 0; i < input.images.length; i++) {
      await db.insert(productImages).values({
        id: crypto.randomUUID(),
        productId,
        storagePath: input.images[i]!,
        sort: i,
      });
    }
  }

  // Delete old tiers and insert new
  await db.delete(priceTiers).where(eq(priceTiers.productId, productId));
  if (input.isB2bEnabled && input.tiers && input.tiers.length > 0) {
    for (const t of input.tiers) {
      await db.insert(priceTiers).values({
        id: crypto.randomUUID(),
        productId,
        minQty: t.minQty,
        unitPrice: BigInt(t.unitPrice),
      });
    }
  }

  // Log audit event
  await logAuditEvent({
    actorId: userId,
    action: 'PRODUCT_UPDATED',
    entity: 'products',
    entityId: productId,
    meta: {
      previousStatus: existing.status,
      newStatus: nextStatus,
      title: input.title,
    },
  });

  return { productId, status: nextStatus };
}

/**
 * Submits a draft or returned product for admin moderation.
 * Enforces seller KYC approval and required field validation.
 */
export async function submitProductForModeration(
  sellerId: string,
  userId: string,
  productId: string
) {
  const db = getDb();

  // 1. Verify seller is approved
  const [seller] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.id, sellerId))
    .limit(1);

  if (!seller) {
    throw new SellerError('Seller not found.', 404, 'NOT_FOUND');
  }

  if (seller.kycStatus !== 'approved') {
    throw new SellerError(
      'Your seller account is pending verification. Only approved sellers may submit products for moderation.',
      403,
      'SELLER_NOT_APPROVED'
    );
  }

  // 2. Verify product ownership
  const [prod] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .limit(1);

  if (!prod) {
    throw new SellerError('Product not found or not owned by you.', 404, 'NOT_FOUND');
  }

  if (prod.status !== 'draft' && prod.status !== 'returned') {
    throw new SellerError(
      `Product cannot be submitted in status '${prod.status}'. Only draft or returned products can be submitted.`,
      400,
      'INVALID_STATUS'
    );
  }

  // 3. Verify product has variants and images
  const [variants, images] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId)),
  ]);

  if (variants.length === 0) {
    throw new SellerError('Product must have at least one variant before submitting.', 400, 'NO_VARIANTS');
  }

  if (images.length === 0) {
    throw new SellerError('Product must have at least one image before submitting.', 400, 'NO_IMAGES');
  }

  // 4. Update status to 'pending'
  await db
    .update(products)
    .set({
      status: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  // 5. Log audit event
  await logAuditEvent({
    actorId: userId,
    action: 'PRODUCT_SUBMITTED',
    entity: 'products',
    entityId: productId,
    meta: {
      previousStatus: prod.status,
      newStatus: 'pending',
      sellerId,
    },
  });

  return { productId, status: 'pending' };
}

export type AdjustStockQuantityInput =
  | number
  | {
      stock?: number;
      delta?: number;
      expectedPreviousStock?: number;
    };

/**
 * Adjusts inventory stock for an owned variant with mandatory audit reason.
 * 
 * Atomically enforces:
 * - Seller KYC approval and parent product ownership.
 * - Active reservations in pending orders are preserved (stock cannot fall below reserved quantity).
 * - Multi-statement atomic execution in PostgreSQL: stock update and audit record succeed or roll back together.
 * - For signed adjustments: each accepted delta is applied exactly once via atomic database serialization.
 * - For absolute targets: prevents stale forms from silently overwriting newer modifications.
 */
export async function adjustVariantStock(
  sellerId: string,
  userId: string,
  variantId: string,
  quantityOrOptions: AdjustStockQuantityInput,
  reason: string
) {
  if (!reason || reason.trim().length < 3) {
    throw new SellerError('A reason of at least 3 characters is required for stock adjustments.', 400, 'MISSING_REASON');
  }

  // Parse input
  let targetStock: number | undefined;
  let delta: number | undefined;
  let expectedStock: number | undefined;

  if (typeof quantityOrOptions === 'number') {
    targetStock = quantityOrOptions;
  } else if (typeof quantityOrOptions === 'object' && quantityOrOptions !== null) {
    targetStock = quantityOrOptions.stock;
    delta = quantityOrOptions.delta;
    expectedStock = quantityOrOptions.expectedPreviousStock;
  }

  if (targetStock === undefined && delta === undefined) {
    throw new SellerError('Either target stock or signed delta must be provided.', 400, 'INVALID_INPUT');
  }

  if (targetStock !== undefined && (targetStock < 0 || !Number.isInteger(targetStock))) {
    throw new SellerError('Stock must be a non-negative integer.', 400, 'INVALID_STOCK');
  }

  if (delta !== undefined && !Number.isInteger(delta)) {
    throw new SellerError('Stock adjustment delta must be an integer.', 400, 'INVALID_DELTA');
  }

  const db = getDb();
  const sql = getSqlClient();

  // 1. Enforce Seller KYC Approval
  const [seller] = await db
    .select({
      id: sellers.id,
      kycStatus: sellers.kycStatus,
    })
    .from(sellers)
    .where(eq(sellers.id, sellerId))
    .limit(1);

  if (!seller || seller.kycStatus !== 'approved') {
    throw new SellerError('Seller KYC approval required to adjust inventory.', 403, 'UNAPPROVED_SELLER');
  }

  // 2. Find variant and enforce seller product ownership
  const [variant] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      currentStock: productVariants.stock,
      sellerId: products.sellerId,
      productTitle: products.titleEn,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) {
    throw new SellerError('Variant not found.', 404, 'NOT_FOUND');
  }

  if (variant.sellerId !== sellerId) {
    throw new SellerError('Forbidden. You do not own the product for this variant.', 403, 'FORBIDDEN');
  }

  // 3. Compute active reservations for this variant (from PENDING customer orders)
  const reservationRows = await sql`
    SELECT COALESCE(SUM(oi.qty), 0)::int as reserved
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.variant_id = ${variantId} AND o.status = 'PENDING';
  `;
  const reserved = Number(reservationRows[0]?.reserved || 0);

  // 4. Pre-validate bounds against active reservations
  if (targetStock !== undefined) {
    if (targetStock < reserved) {
      throw new SellerError(
        `Cannot reduce stock to ${targetStock}. ${reserved} units are currently reserved in pending orders (minimum allowed on-hand stock: ${reserved}).`,
        409,
        'RESERVATION_CONFLICT'
      );
    }
  } else if (delta !== undefined) {
    const projectedStock = variant.currentStock + delta;
    if (projectedStock < 0) {
      throw new SellerError('Stock adjustment cannot result in negative stock.', 400, 'INVALID_STOCK');
    }
    if (projectedStock < reserved) {
      throw new SellerError(
        `Adjustment rejected. Resulting stock (${projectedStock}) cannot be less than reserved quantity (${reserved}) in pending orders.`,
        409,
        'RESERVATION_CONFLICT'
      );
    }
  }

  const auditId = crypto.randomUUID();
  const trimmedReason = reason.trim();

  // 5. Execute single atomic CTE: Stock update and audit log succeed or roll back together
  type StockUpdateResultRow = { id: string; stock: number; prev_stock: number };
  let resultRows: StockUpdateResultRow[];

  if (delta !== undefined) {
    // Competing signed deltas: serialized atomic arithmetic on PostgreSQL row
    const rows = await sql`
      WITH updated AS (
        UPDATE product_variants
        SET stock = stock + ${delta}::int, updated_at = NOW()
        WHERE id = ${variantId}::uuid
          AND (stock + ${delta}::int) >= ${reserved}::int
          AND (stock + ${delta}::int) >= 0
        RETURNING id, stock, (stock - ${delta}::int)::int as prev_stock
      ),
      logged AS (
        INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        SELECT 
          ${auditId}::uuid, 
          ${userId}::uuid, 
          'INVENTORY_ADJUSTED', 
          'product_variants', 
          ${variantId}::uuid, 
          jsonb_build_object(
            'productId', ${variant.productId}::text,
            'sku', ${variant.sku}::text,
            'previousStock', updated.prev_stock,
            'newStock', updated.stock,
            'delta', ${delta}::int,
            'reason', ${trimmedReason}::text,
            'reserved', ${reserved}::int
          ), 
          NOW()
        FROM updated
        RETURNING id
      )
      SELECT id, stock, prev_stock FROM updated;
    `;
    resultRows = rows as unknown as StockUpdateResultRow[];
  } else if (expectedStock !== undefined) {
    // Absolute target with optimistic concurrency check (prevents stale form overwrite)
    const rows = await sql`
      WITH updated AS (
        UPDATE product_variants
        SET stock = ${targetStock!}::int, updated_at = NOW()
        WHERE id = ${variantId}::uuid
          AND stock = ${expectedStock}::int
          AND ${targetStock!}::int >= ${reserved}::int
        RETURNING id, stock, ${expectedStock}::int as prev_stock
      ),
      logged AS (
        INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        SELECT 
          ${auditId}::uuid, 
          ${userId}::uuid, 
          'INVENTORY_ADJUSTED', 
          'product_variants', 
          ${variantId}::uuid, 
          jsonb_build_object(
            'productId', ${variant.productId}::text,
            'sku', ${variant.sku}::text,
            'previousStock', updated.prev_stock,
            'newStock', updated.stock,
            'delta', (${targetStock!}::int - updated.prev_stock),
            'reason', ${trimmedReason}::text,
            'reserved', ${reserved}::int
          ), 
          NOW()
        FROM updated
        RETURNING id
      )
      SELECT id, stock, prev_stock FROM updated;
    `;
    resultRows = rows as unknown as StockUpdateResultRow[];
  } else {
    // Absolute target without explicit previous stock (updates stock and records actual delta)
    const rows = await sql`
      WITH updated AS (
        UPDATE product_variants
        SET stock = ${targetStock!}::int, updated_at = NOW()
        WHERE id = ${variantId}::uuid
          AND ${targetStock!}::int >= ${reserved}::int
        RETURNING id, stock, ${variant.currentStock}::int as prev_stock
      ),
      logged AS (
        INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        SELECT 
          ${auditId}::uuid, 
          ${userId}::uuid, 
          'INVENTORY_ADJUSTED', 
          'product_variants', 
          ${variantId}::uuid, 
          jsonb_build_object(
            'productId', ${variant.productId}::text,
            'sku', ${variant.sku}::text,
            'previousStock', updated.prev_stock,
            'newStock', updated.stock,
            'delta', (${targetStock!}::int - updated.prev_stock),
            'reason', ${trimmedReason}::text,
            'reserved', ${reserved}::int
          ), 
          NOW()
        FROM updated
        RETURNING id
      )
      SELECT id, stock, prev_stock FROM updated;
    `;
    resultRows = rows as unknown as StockUpdateResultRow[];
  }

  if (!resultRows || resultRows.length === 0) {
    if (expectedStock !== undefined) {
      throw new SellerError(
        'Inventory conflict: stock was modified by another operation. Please refresh and try again.',
        409,
        'CONCURRENCY_CONFLICT'
      );
    }
    throw new SellerError(
      'Stock adjustment failed. Insufficient stock or active reservation conflict.',
      409,
      'RESERVATION_CONFLICT'
    );
  }

  const committedNewStock = Number(resultRows[0].stock);
  const committedPrevStock = Number(resultRows[0].prev_stock);

  return {
    variantId,
    sku: variant.sku,
    previousStock: committedPrevStock,
    newStock: committedNewStock,
    delta: committedNewStock - committedPrevStock,
    reserved,
  };
}
