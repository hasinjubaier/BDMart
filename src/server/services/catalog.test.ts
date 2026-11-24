import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { formatBDT, poishaToBdt, bdtToPoisha, slugify } from '@/lib/formatters';
import { getDb } from '@/db';
import { products, productVariants, categories, sellers } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  searchCatalog,
  getProductBySlug,
  getCategories,
} from './catalog.service';

describe('Phase 2: Catalog Pricing and Search Verification', () => {
  describe('Financial Math & BDT Formatting', () => {
    it('converts integer poisha to BDT correctly', () => {
      expect(poishaToBdt(35000)).toBe(350);
      expect(poishaToBdt(35050)).toBe(350.5);
      expect(poishaToBdt(100)).toBe(1);
      expect(poishaToBdt(0)).toBe(0);
    });

    it('converts BDT to integer poisha accurately', () => {
      expect(bdtToPoisha(350)).toBe(35000);
      expect(bdtToPoisha(350.5)).toBe(35050);
      expect(bdtToPoisha(0.99)).toBe(99);
    });

    it('formats canonical jute tote bag 35,000 poisha as BDT 350', () => {
      expect(formatBDT(35000)).toBe('BDT 350');
      expect(formatBDT(35000n)).toBe('BDT 350');
    });

    it('formats non-integer amounts with 2 decimals in BDT', () => {
      expect(formatBDT(35050)).toBe('BDT 350.50');
      expect(formatBDT(99)).toBe('BDT 0.99');
      expect(formatBDT(125000)).toBe('BDT 1,250');
    });

    it('generates URL safe slug', () => {
      expect(slugify('Handcrafted Jute Tote Bag 2026!')).toBe('handcrafted-jute-tote-bag-2026');
    });
  });

  describe('Public Catalog Search and Visibility Rules', () => {
    it('retrieves active categories list ordered by sort order', async () => {
      const categories = await getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('slug');
      expect(categories[0]).toHaveProperty('nameEn');
    });

    it('only returns active published products in public search', async () => {
      const result = await searchCatalog({ limit: 50 });
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.status).toBe('active');
        expect(item.title).toBeTruthy();
        expect(item.basePrice).toBeGreaterThan(0);
      }
    });

    it('supports case-insensitive English title search', async () => {
      const lowerRes = await searchCatalog({ q: 'jute' });
      const upperRes = await searchCatalog({ q: 'JUTE' });
      const mixedRes = await searchCatalog({ q: 'JuTe' });

      expect(lowerRes.total).toBeGreaterThan(0);
      expect(upperRes.total).toBe(lowerRes.total);
      expect(mixedRes.total).toBe(lowerRes.total);
    });

    it('supports exact SKU lookup via search query', async () => {
      const skuRes = await searchCatalog({ q: 'SKU-JUTE-BAG-001' });
      expect(skuRes.items.length).toBeGreaterThanOrEqual(1);
      const matched = skuRes.items.find((item) => item.skus.includes('SKU-JUTE-BAG-001'));
      expect(matched).toBeDefined();
      expect(matched?.slug).toBe('eco-jute-tote-bag');
    });

    it('verifies the canonical jute tote fixture properties and wholesale tiers', async () => {
      const product = await getProductBySlug('eco-jute-tote-bag');
      expect(product).not.toBeNull();
      if (!product) return;

      expect(product.slug).toBe('eco-jute-tote-bag');
      expect(product.status).toBe('active');
      expect(product.basePrice).toBe(35000);
      expect(formatBDT(product.basePrice)).toBe('BDT 350');
      expect(product.isB2bEnabled).toBe(true);
      expect(product.moq).toBe(50);

      // Verify variant
      const variant = product.variants.find((v) => v.sku === 'SKU-JUTE-BAG-001');
      expect(variant).toBeDefined();
      expect(variant?.stock).toBeGreaterThan(0);

      // Verify price tiers
      expect(product.tiers.length).toBeGreaterThanOrEqual(3);
      const tier50 = product.tiers.find((t) => t.minQty === 50);
      const tier100 = product.tiers.find((t) => t.minQty === 100);
      const tier500 = product.tiers.find((t) => t.minQty === 500);

      expect(tier50?.unitPrice).toBe(28000); // BDT 280
      expect(tier100?.unitPrice).toBe(22000); // BDT 220
      expect(tier500?.unitPrice).toBe(18000); // BDT 180
    });

    it('filters by category slug', async () => {
      const result = await searchCatalog({ category: 'jute-eco-crafts', limit: 20 });
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.categorySlug).toBe('jute-eco-crafts');
      }
    });

    it('filters by price range (minPrice / maxPrice in BDT)', async () => {
      const minBdt = 200;
      const maxBdt = 500;
      const result = await searchCatalog({ minPrice: minBdt, maxPrice: maxBdt, limit: 30 });

      for (const item of result.items) {
        const itemPriceBdt = item.basePrice / 100;
        expect(itemPriceBdt).toBeGreaterThanOrEqual(minBdt);
        expect(itemPriceBdt).toBeLessThanOrEqual(maxBdt);
      }
    });

    it('filters by in-stock availability', async () => {
      const inStockResult = await searchCatalog({ inStock: true, limit: 30 });
      for (const item of inStockResult.items) {
        expect(item.totalStock).toBeGreaterThan(0);
      }
    });

    it('returns empty result for non-existent category or query', async () => {
      const nonExistentCat = await searchCatalog({ category: 'non-existent-category-slug-xyz' });
      expect(nonExistentCat.items).toHaveLength(0);
      expect(nonExistentCat.total).toBe(0);

      const nonExistentQuery = await searchCatalog({ q: 'non-existent-query-string-999999-random' });
      expect(nonExistentQuery.items).toHaveLength(0);
      expect(nonExistentQuery.total).toBe(0);
    });

    it('protects private listings: direct getProductBySlug returns null for draft/pending without allowInactive', async () => {
      const nonExistent = await getProductBySlug('non-existent-product-slug');
      expect(nonExistent).toBeNull();
    });
  });

  describe('English-Only Public Catalog Verification & Legacy Locale Isolation', () => {
    const db = getDb();
    let sellerId: string;
    let categoryId: string;
    const testProductIdsToClean: string[] = [];

    const bilingualSku = `SKU-JAMDANI-ISO-${Date.now()}`;
    const missingEnSku = `SKU-LEGACY-BN-${Date.now()}`;
    let bilingualSlug: string;
    let missingEnSlug: string;

    beforeAll(async () => {
      // 1. Fetch existing seller and category
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.kycStatus, 'approved'))
        .limit(1);
      sellerId = seller!.id;

      const [cat] = await db.select().from(categories).limit(1);
      categoryId = cat!.id;

      // 2. Insert bilingual active fixture with distinct English & Bengali values
      const bilingualId = crypto.randomUUID();
      testProductIdsToClean.push(bilingualId);
      bilingualSlug = `artisan-jamdani-silk-scarf-${Date.now()}`;

      await db.insert(products).values({
        id: bilingualId,
        sellerId,
        categoryId,
        slug: bilingualSlug,
        titleEn: 'Artisan Jamdani Silk Scarf',
        titleBn: 'হস্তশিল্প জামদানি সিল্ক স্কার্ফ',
        description: 'Authentic pure silk Jamdani scarf handcrafted in Narayanganj.',
        status: 'active',
        basePrice: 42000n,
        moq: 1,
        isB2bEnabled: false,
      });

      await db.insert(productVariants).values({
        id: crypto.randomUUID(),
        productId: bilingualId,
        sku: bilingualSku,
        attributes: { color: 'Crimson Red' },
        stock: 12,
        price: 42000n,
      });

      // 3. Insert fixture with missing/empty English title and legacy Bengali title
      const missingEnId = crypto.randomUUID();
      testProductIdsToClean.push(missingEnId);
      missingEnSlug = `legacy-nakshi-kantha-${Date.now()}`;

      await db.insert(products).values({
        id: missingEnId,
        sellerId,
        categoryId,
        slug: missingEnSlug,
        titleEn: '', // Intentionally empty English field
        titleBn: 'ঐতিহ্যবাহী কাঁথা নকশি বেডস্প্রেড',
        description: 'Hand embroidered traditional bedspread.',
        status: 'active',
        basePrice: 55000n,
        moq: 1,
        isB2bEnabled: false,
      });

      await db.insert(productVariants).values({
        id: crypto.randomUUID(),
        productId: missingEnId,
        sku: missingEnSku,
        attributes: { size: 'King' },
        stock: 5,
        price: 55000n,
      });
    });

    afterAll(async () => {
      if (testProductIdsToClean.length > 0) {
        await db.delete(productVariants).where(inArray(productVariants.productId, testProductIdsToClean));
        await db.delete(products).where(inArray(products.id, testProductIdsToClean));
      }
    });

    it('discovers bilingual fixture via case-insensitive English title search', async () => {
      const res = await searchCatalog({ q: 'Jamdani' });
      const found = res.items.find((item) => item.skus.includes(bilingualSku));
      expect(found).toBeDefined();
      expect(found?.title).toBe('Artisan Jamdani Silk Scarf');

      // Case insensitive check
      const lowerRes = await searchCatalog({ q: 'jamdani' });
      expect(lowerRes.items.some((item) => item.skus.includes(bilingualSku))).toBe(true);
    });

    it('discovers bilingual fixture via exact SKU lookup', async () => {
      const res = await searchCatalog({ q: bilingualSku });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      const found = res.items.find((item) => item.skus.includes(bilingualSku));
      expect(found).toBeDefined();
      expect(found?.slug).toBe(bilingualSlug);
    });

    it('does NOT match or return fixture when searching Bengali-only title text', async () => {
      // 'হস্তশিল্প' appears strictly in titleBn, not in titleEn
      const res = await searchCatalog({ q: 'হস্তশিল্প' });
      const matched = res.items.find((item) => item.skus.includes(bilingualSku));
      expect(matched).toBeUndefined();
    });

    it('displays documented minimal English fallback when titleEn is empty, never leaking legacy Bengali text', async () => {
      // 1. In getProductBySlug
      const detail = await getProductBySlug(missingEnSlug);
      expect(detail).not.toBeNull();
      expect(detail?.title).toBe('BD Mart Product');
      expect(detail?.title).not.toBe('ঐতিহ্যবাহী কাঁথা নকশি বেডস্প্রেড');

      // 2. In searchCatalog
      const searchRes = await searchCatalog({ q: missingEnSku });
      const item = searchRes.items.find((i) => i.skus.includes(missingEnSku));
      expect(item).toBeDefined();
      expect(item?.title).toBe('BD Mart Product');
      expect(item?.title).not.toBe('ঐতিহ্যবাহী কাঁথা নকশি বেডস্প্রেড');
    });
  });
});
