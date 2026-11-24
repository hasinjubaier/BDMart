import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  categories,
  products,
  productVariants,
  productImages,
  priceTiers,
  sellers,
  users,
} from '@/db/schema';
import type { CatalogQueryParams } from '@/lib/validators/catalog';

export interface CatalogProductItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePrice: number; // in poisha
  moq: number;
  isB2bEnabled: boolean;
  status: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sellerId: string;
  sellerShopName: string;
  sellerKycStatus: string;
  primaryImage: string;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  variantCount: number;
  skus: string[];
}

export interface CatalogSearchResult {
  items: CatalogProductItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getCategories() {
  const db = getDb();
  return db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameBn: categories.nameBn,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
}

export async function getCategoryBySlug(slug: string) {
  const db = getDb();
  const [cat] = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameBn: categories.nameBn,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return cat || null;
}

export async function searchCatalog(params: Partial<CatalogQueryParams>): Promise<CatalogSearchResult> {
  const db = getDb();
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 12));
  const offset = (page - 1) * limit;

  // Base condition: only ACTIVE published listings
  const conditions = [eq(products.status, 'active')];

  // Category filter
  if (params.category) {
    const categoryRecord = await getCategoryBySlug(params.category);
    if (categoryRecord) {
      conditions.push(eq(products.categoryId, categoryRecord.id));
    } else {
      // Unknown category slug returns 0 results
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  // Price range (in BDT from query, converted to poisha)
  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    const minPoisha = BigInt(Math.round(params.minPrice * 100));
    conditions.push(sql`${products.basePrice} >= ${minPoisha}`);
  }
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    const maxPoisha = BigInt(Math.round(params.maxPrice * 100));
    conditions.push(sql`${products.basePrice} <= ${maxPoisha}`);
  }

  // Seller filter
  if (params.seller) {
    conditions.push(
      sql`(${products.sellerId}::text = ${params.seller} OR ${sellers.shopName} ILIKE ${'%' + params.seller + '%'})`
    );
  }

  // Search query (case-insensitive English title search or exact/partial SKU lookup)
  if (params.q && params.q.trim()) {
    const qTerm = params.q.trim();
    // English-only title search OR variant SKU search (excludes legacy Bengali title matching)
    conditions.push(sql`(
      ${products.titleEn} ILIKE ${'%' + qTerm + '%'} OR
      EXISTS (
        SELECT 1 FROM ${productVariants} pv 
        WHERE pv.product_id = ${products.id} 
        AND pv.sku ILIKE ${'%' + qTerm + '%'}
      )
    )`);
  }

  // Stock filter (inStock === true requires at least one variant with available stock > 0, accounting for active reservations)
  if (params.inStock === true) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${productVariants} pv
      WHERE pv.product_id = ${products.id} 
        AND (pv.stock - COALESCE((
          SELECT SUM(oi.qty)::int 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE oi.variant_id = pv.id AND o.status = 'PENDING'
        ), 0)) > 0
    )`);
  } else if (params.inStock === false) {
    conditions.push(sql`NOT EXISTS (
      SELECT 1 FROM ${productVariants} pv
      WHERE pv.product_id = ${products.id} 
        AND (pv.stock - COALESCE((
          SELECT SUM(oi.qty)::int 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE oi.variant_id = pv.id AND o.status = 'PENDING'
        ), 0)) > 0
    )`);
  }

  const whereClause = and(...conditions);

  // Sorting
  let orderByClause;
  switch (params.sort) {
    case 'price_asc':
      orderByClause = [asc(products.basePrice), desc(products.createdAt)];
      break;
    case 'price_desc':
      orderByClause = [desc(products.basePrice), desc(products.createdAt)];
      break;
    case 'title_asc':
      orderByClause = [asc(products.titleEn), desc(products.createdAt)];
      break;
    case 'newest':
    default:
      orderByClause = [desc(products.createdAt)];
      break;
  }

  // Total count
  const [countResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${products.id})::int` })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(whereClause);

  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / limit);

  if (total === 0) {
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  // Fetch paginated products
  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      titleEn: products.titleEn,
      titleBn: products.titleBn,
      description: products.description,
      basePrice: products.basePrice,
      moq: products.moq,
      isB2bEnabled: products.isB2bEnabled,
      status: products.status,
      categoryId: products.categoryId,
      categoryNameEn: categories.nameEn,
      categoryNameBn: categories.nameBn,
      categorySlug: categories.slug,
      sellerId: products.sellerId,
      sellerShopName: sellers.shopName,
      sellerKycStatus: sellers.kycStatus,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(limit)
    .offset(offset);

  const productIds = productRows.map((p) => p.id);

  // Fetch variants for these products to compute available stock, min/max price, SKUs
  const variants = productIds.length > 0
    ? await db
      .select({
        productId: productVariants.productId,
        sku: productVariants.sku,
        stock: sql<number>`GREATEST(0, ${productVariants.stock} - COALESCE((
            SELECT SUM(oi.qty)::int 
            FROM order_items oi 
            JOIN orders o ON oi.order_id = o.id 
            WHERE oi.variant_id = "product_variants"."id" AND o.status = 'PENDING'
          ), 0))::int`,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
    : [];

  // Fetch primary image for each product
  const images = productIds.length > 0
    ? await db
      .select({
        productId: productImages.productId,
        storagePath: productImages.storagePath,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sort))
    : [];

  const items: CatalogProductItem[] = productRows.map((p) => {
    const prodVariants = variants.filter((v) => v.productId === p.id);
    const prodImages = images.filter((img) => img.productId === p.id);
    const primaryImage = prodImages[0]?.storagePath || '/placeholder-product.svg';
    const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);
    const prices = prodVariants.map((v) => Number(v.price));
    const minPrice = prices.length > 0 ? Math.min(...prices) : Number(p.basePrice);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : Number(p.basePrice);

    return {
      id: p.id,
      slug: p.slug,
      // English-only title with minimal English fallback (never falls back to titleBn)
      title: p.titleEn && p.titleEn.trim().length > 0 ? p.titleEn.trim() : 'BD Mart Product',
      description: p.description,
      basePrice: Number(p.basePrice),
      moq: p.moq,
      isB2bEnabled: p.isB2bEnabled,
      status: p.status,
      categoryId: p.categoryId,
      categoryName: p.categoryNameEn && p.categoryNameEn.trim().length > 0 ? p.categoryNameEn.trim() : 'Uncategorized',
      categorySlug: p.categorySlug,
      sellerId: p.sellerId,
      sellerShopName: p.sellerShopName,
      sellerKycStatus: p.sellerKycStatus,
      primaryImage,
      totalStock,
      minPrice,
      maxPrice,
      variantCount: prodVariants.length,
      skus: prodVariants.map((v) => v.sku),
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  };
}

export interface DetailedProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePrice: number;
  moq: number;
  isB2bEnabled: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    slug: string;
    name: string;
  };
  seller: {
    id: string;
    shopName: string;
    kycStatus: string;
  };
  variants: Array<{
    id: string;
    sku: string;
    attributes: Record<string, unknown>;
    stock: number;
    price: number;
  }>;
  images: Array<{
    id: string;
    storagePath: string;
    sort: number;
  }>;
  tiers: Array<{
    id: string;
    minQty: number;
    unitPrice: number;
  }>;
}

/**
 * Fetches product detail by slug.
 * By default, only returns active products for public view.
 * If allowDraftOrPending is true (for seller preview or admin review), returns regardless of status.
 */
export async function getProductBySlug(
  slug: string,
  options: { allowInactive?: boolean } = {}
): Promise<DetailedProduct | null> {
  const db = getDb();

  const conditions = [eq(products.slug, slug)];
  if (!options.allowInactive) {
    conditions.push(eq(products.status, 'active'));
  }

  const [prod] = await db
    .select({
      id: products.id,
      slug: products.slug,
      titleEn: products.titleEn,
      titleBn: products.titleBn,
      description: products.description,
      basePrice: products.basePrice,
      moq: products.moq,
      isB2bEnabled: products.isB2bEnabled,
      status: products.status,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameBn: categories.nameBn,
      sellerId: products.sellerId,
      sellerShopName: sellers.shopName,
      sellerKycStatus: sellers.kycStatus,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(and(...conditions))
    .limit(1);

  if (!prod) return null;

  const [variants, images, tiers] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        attributes: productVariants.attributes,
        stock: sql<number>`GREATEST(0, ${productVariants.stock} - COALESCE((
          SELECT SUM(oi.qty)::int 
          FROM order_items oi 
          JOIN orders o ON oi.order_id = o.id 
          WHERE oi.variant_id = "product_variants"."id" AND o.status = 'PENDING'
        ), 0))::int`,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, prod.id))
      .orderBy(asc(productVariants.sku)),
    db
      .select({
        id: productImages.id,
        storagePath: productImages.storagePath,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(eq(productImages.productId, prod.id))
      .orderBy(asc(productImages.sort)),
    db
      .select({
        id: priceTiers.id,
        minQty: priceTiers.minQty,
        unitPrice: priceTiers.unitPrice,
      })
      .from(priceTiers)
      .where(eq(priceTiers.productId, prod.id))
      .orderBy(asc(priceTiers.minQty)),
  ]);

  return {
    id: prod.id,
    slug: prod.slug,
    // English-only title with minimal English fallback (never falls back to titleBn)
    title: prod.titleEn && prod.titleEn.trim().length > 0 ? prod.titleEn.trim() : 'BD Mart Product',
    description: prod.description,
    basePrice: Number(prod.basePrice),
    moq: prod.moq,
    isB2bEnabled: prod.isB2bEnabled,
    status: prod.status,
    createdAt: prod.createdAt,
    updatedAt: prod.updatedAt,
    category: {
      id: prod.categoryId,
      slug: prod.categorySlug,
      name: prod.categoryNameEn && prod.categoryNameEn.trim().length > 0 ? prod.categoryNameEn.trim() : 'Uncategorized',
    },
    seller: {
      id: prod.sellerId,
      shopName: prod.sellerShopName,
      kycStatus: prod.sellerKycStatus,
    },
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      attributes: v.attributes,
      stock: v.stock,
      price: Number(v.price),
    })),
    images,
    tiers: tiers.map((t) => ({
      id: t.id,
      minQty: t.minQty,
      unitPrice: Number(t.unitPrice),
    })),
  };
}

export async function getSellerStorefront(sellerId: string) {
  const db = getDb();
  const [seller] = await db
    .select({
      id: sellers.id,
      shopName: sellers.shopName,
      kycStatus: sellers.kycStatus,
      createdAt: sellers.createdAt,
      ownerName: users.name,
    })
    .from(sellers)
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(eq(sellers.id, sellerId))
    .limit(1);

  if (!seller) return null;

  const catalog = await searchCatalog({
    seller: seller.id,
    limit: 24,
    sort: 'newest',
  });

  return {
    seller,
    products: catalog.items,
    totalProducts: catalog.total,
  };
}
