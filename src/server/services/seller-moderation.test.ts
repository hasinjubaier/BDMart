import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '@/db';
import {
  products,
  productVariants,
  categories,
  sellers,
  users,
  auditLogs,
  orders,
  orderItems,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  createProductDraft,
  updateProductDraft,
  submitProductForModeration,
  adjustVariantStock,
  getSellerProducts,
  SellerError,
} from './seller.service';
import {
  getModerationQueue,
  publishProduct,
  returnProduct,
} from './moderation.service';
import { getProductBySlug } from './catalog.service';

describe('Phase 2: Seller Workspace, Moderation & Inventory Concurrency', () => {
  const db = getDb();

  // Test identifiers
  let categoryId: string;
  let sellerAId: string;
  let sellerAUserId: string;
  let sellerBId: string;
  let sellerBUserId: string;
  let adminUserId: string;
  let unapprovedSellerId: string;
  let unapprovedUserId: string;

  const testProductIdsToClean: string[] = [];
  const testOrderIdsToClean: string[] = [];
  const testVariantIdsToClean: string[] = [];

  beforeAll(async () => {
    // 1. Get an existing category
    const [cat] = await db.select().from(categories).limit(1);
    categoryId = cat!.id;

    // 2. Get existing approved sellers
    const [sellerA] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.kycStatus, 'approved'))
      .limit(1);

    sellerAId = sellerA!.id;
    sellerAUserId = sellerA!.userId;

    // Get second seller if exists or fetch
    const allSellers = await db
      .select()
      .from(sellers)
      .where(eq(sellers.kycStatus, 'approved'));

    sellerBId = allSellers[1] ? allSellers[1]!.id : allSellers[0]!.id;
    sellerBUserId = allSellers[1] ? allSellers[1]!.userId : allSellers[0]!.userId;

    // 3. Get admin
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    adminUserId = adminUser!.id;

    // 4. Create an isolated unapproved seller for test
    unapprovedUserId = crypto.randomUUID();
    unapprovedSellerId = crypto.randomUUID();

    await db.insert(users).values({
      id: unapprovedUserId,
      firebaseUid: `test-uid-unapproved-${Date.now()}`,
      phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: 'Unapproved Test Seller',
      role: 'seller',
      locale: 'en',
    });

    await db.insert(sellers).values({
      id: unapprovedSellerId,
      userId: unapprovedUserId,
      shopName: 'Unapproved Test Shop',
      tradeLicenseNo: `TL-UNAPP-${Date.now()}`,
      tradeLicenseUrl: 'https://storage.bdmart.com/private/tl-test.pdf',
      nidRef: 'NID-999999999',
      kycStatus: 'pending', // Unapproved!
    });
  });

  afterAll(async () => {
    // Cleanup test orders and order items first to avoid FK restrict
    if (testOrderIdsToClean.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.orderId, testOrderIdsToClean));
      await db.delete(orders).where(inArray(orders.id, testOrderIdsToClean));
    }
    // Cleanup variant audit logs
    if (testVariantIdsToClean.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.entityId, testVariantIdsToClean));
    }
    // Cleanup isolated test products and product audit logs
    if (testProductIdsToClean.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.entityId, testProductIdsToClean));
      await db.delete(products).where(inArray(products.id, testProductIdsToClean));
    }
    // Cleanup unapproved seller
    if (unapprovedSellerId) {
      await db.delete(sellers).where(eq(sellers.id, unapprovedSellerId));
      await db.delete(users).where(eq(users.id, unapprovedUserId));
    }
  });

  describe('Permissions & Ownership Enforcement', () => {
    it('prevents an unapproved seller from submitting a product for moderation', async () => {
      // 1. Unapproved seller creates a draft
      const testSku = `SKU-UNAPP-${Date.now()}`;
      const { productId } = await createProductDraft(unapprovedSellerId, unapprovedUserId, {
        title: 'Unapproved Draft Item',
        description: 'Detailed description for testing unapproved seller restrictions.',
        categoryId,
        basePrice: 50000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/test.webp'],
        variants: [{ sku: testSku, attributes: { color: 'Blue' }, stock: 10, price: 50000 }],
      });
      testProductIdsToClean.push(productId);

      // 2. Attempt to submit for moderation should fail
      await expect(
        submitProductForModeration(unapprovedSellerId, unapprovedUserId, productId)
      ).rejects.toThrow(/pending verification/i);

      // Verify status remains draft
      const [prod] = await db.select().from(products).where(eq(products.id, productId));
      expect(prod?.status).toBe('draft');
    });

    it('prevents Seller B from modifying or updating Seller A listing', async () => {
      // Seller A creates a draft
      const testSku = `SKU-SELLER-A-${Date.now()}`;
      const { productId } = await createProductDraft(sellerAId, sellerAUserId, {
        title: 'Seller A Exclusive Item',
        description: 'Description for testing ownership isolation boundaries.',
        categoryId,
        basePrice: 40000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/test.webp'],
        variants: [{ sku: testSku, attributes: { size: 'Large' }, stock: 25, price: 40000 }],
      });
      testProductIdsToClean.push(productId);

      // Seller B attempts to update Seller A's product
      if (sellerBId !== sellerAId) {
        await expect(
          updateProductDraft(sellerBId, sellerBUserId, productId, {
            title: 'Hijacked Title by Seller B',
            description: 'Malicious update attempt.',
            categoryId,
            basePrice: 10000,
            moq: 1,
            isB2bEnabled: false,
            images: ['/products/hacked.webp'],
            variants: [{ sku: testSku, attributes: {}, stock: 100, price: 10000 }],
          })
        ).rejects.toThrow(SellerError);

        // Verify product record remains completely unchanged
        const [prod] = await db.select().from(products).where(eq(products.id, productId));
        expect(prod?.titleEn).toBe('Seller A Exclusive Item');
        expect(Number(prod?.basePrice)).toBe(40000);
      }
    });

    it('prevents Seller B from adjusting inventory of Seller A variant', async () => {
      const testSku = `SKU-STOCK-ISO-${Date.now()}`;
      const { productId } = await createProductDraft(sellerAId, sellerAUserId, {
        title: 'Seller A Stock Item',
        description: 'Item for stock ownership test.',
        categoryId,
        basePrice: 30000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/test.webp'],
        variants: [{ sku: testSku, attributes: {}, stock: 50, price: 30000 }],
      });
      testProductIdsToClean.push(productId);

      const [variant] = await db.select().from(productVariants).where(eq(productVariants.sku, testSku));

      if (sellerBId !== sellerAId && variant) {
        await expect(
          adjustVariantStock(sellerBId, sellerBUserId, variant.id, 0, 'Malicious stock zeroing')
        ).rejects.toThrow(SellerError);

        // Verify stock is untouched
        const [freshVariant] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
        expect(freshVariant?.stock).toBe(50);
      }
    });

    it('enforces global SKU uniqueness across variants', async () => {
      const duplicateSku = `SKU-DUP-${Date.now()}`;

      const { productId } = await createProductDraft(sellerAId, sellerAUserId, {
        title: 'Product One With Unique SKU',
        description: 'First product holding this unique SKU code.',
        categoryId,
        basePrice: 20000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/test.webp'],
        variants: [{ sku: duplicateSku, attributes: {}, stock: 10, price: 20000 }],
      });
      testProductIdsToClean.push(productId);

      // Attempting to create another product with the same SKU should be rejected
      await expect(
        createProductDraft(sellerAId, sellerAUserId, {
          title: 'Product Two Attempting Duplicate SKU',
          description: 'Second product attempting to collide on SKU.',
          categoryId,
          basePrice: 25000,
          moq: 1,
          isB2bEnabled: false,
          images: ['/products/test.webp'],
          variants: [{ sku: duplicateSku, attributes: {}, stock: 5, price: 25000 }],
        })
      ).rejects.toThrow(/SKU already exists/i);
    });
  });

  describe('Full Listing Lifecycle (Draft -> Submit -> Return -> Resubmit -> Publish -> Edit Policy)', () => {
    let testProductId: string;
    const testSku = `SKU-JOURNEY-${Date.now()}`;

    it('Step 1: Seller creates a draft listing', async () => {
      const res = await createProductDraft(sellerAId, sellerAUserId, {
        title: 'Lifecycle Handcrafted Bamboo Lantern',
        description: 'Handcrafted natural bamboo lantern for ambient decorative lighting.',
        categoryId,
        basePrice: 45000, // BDT 450
        moq: 10,
        isB2bEnabled: true,
        images: ['/products/bamboo-lantern.webp'],
        variants: [
          { sku: testSku, attributes: { color: 'Natural Bamboo' }, stock: 30, price: 45000 },
          { sku: `${testSku}-DARK`, attributes: { color: 'Smoked Brown' }, stock: 15, price: 48000 },
        ],
        tiers: [{ minQty: 10, unitPrice: 38000 }],
      });

      testProductId = res.productId;
      testProductIdsToClean.push(testProductId);

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('draft');

      const variants = await db.select().from(productVariants).where(eq(productVariants.productId, testProductId));
      expect(variants).toHaveLength(2);
      const testVariant = variants.find((v) => v.sku === testSku);
      expect(testVariant).toBeDefined();
    });

    it('Step 2: Draft listing is private and absent from public catalog', async () => {
      const publicProd = await getProductBySlug('lifecycle-handcrafted-bamboo-lantern');
      expect(publicProd).toBeNull();
    });

    it('Step 3: Seller submits draft for moderation', async () => {
      const res = await submitProductForModeration(sellerAId, sellerAUserId, testProductId);
      expect(res.status).toBe('pending');

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('pending');
    });

    it('Step 4: Pending listing appears in admin moderation queue', async () => {
      const queue = await getModerationQueue('pending');
      const item = queue.find((q) => q.id === testProductId);
      expect(item).toBeDefined();
      expect(item?.title).toBe('Lifecycle Handcrafted Bamboo Lantern');
    });

    it('Step 5: Admin returns listing with revision reason', async () => {
      const reason = 'Please add specific packaging details in description and ensure safety compliance.';
      const res = await returnProduct(adminUserId, testProductId, reason);
      expect(res.status).toBe('returned');

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('returned');

      // Verify seller sees reason in getSellerProducts
      const sellerProducts = await getSellerProducts(sellerAId, 'returned');
      const returnedItem = sellerProducts.find((p) => p.id === testProductId);
      expect(returnedItem).toBeDefined();
      expect(returnedItem?.moderationReason).toBe(reason);
    });

    it('Step 6: Seller updates listing to address changes and resubmits', async () => {
      // Update description
      await updateProductDraft(sellerAId, sellerAUserId, testProductId, {
        title: 'Lifecycle Handcrafted Bamboo Lantern (Export Packaged)',
        description: 'Handcrafted natural bamboo lantern. Securely packed in reinforced corrugated box with eco-bubble wrap.',
        categoryId,
        basePrice: 45000,
        moq: 10,
        isB2bEnabled: true,
        images: ['/products/bamboo-lantern.webp'],
        variants: [
          { sku: testSku, attributes: { color: 'Natural Bamboo' }, stock: 30, price: 45000 },
          { sku: `${testSku}-DARK`, attributes: { color: 'Smoked Brown' }, stock: 15, price: 48000 },
        ],
      });

      // Resubmit
      const res = await submitProductForModeration(sellerAId, sellerAUserId, testProductId);
      expect(res.status).toBe('pending');
    });

    it('Step 7: Admin publishes listing to live store', async () => {
      const res = await publishProduct(adminUserId, testProductId);
      expect(res.status).toBe('active');

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('active');
    });

    it('Step 8: Published listing is now discoverable in public catalog', async () => {
      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      const publicProd = await getProductBySlug(prod!.slug);
      expect(publicProd).not.toBeNull();
      expect(publicProd?.status).toBe('active');
      expect(publicProd?.title).toBe('Lifecycle Handcrafted Bamboo Lantern (Export Packaged)');
    });

    it('Step 9: Edits after publication policy: Seller updating active product triggers re-moderation', async () => {
      // Seller edits active product
      const updateRes = await updateProductDraft(sellerAId, sellerAUserId, testProductId, {
        title: 'Lifecycle Handcrafted Bamboo Lantern (Unapproved Edit)',
        description: 'New unapproved description.',
        categoryId,
        basePrice: 55000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/bamboo-lantern.webp'],
        variants: [
          { sku: testSku, attributes: { color: 'Natural Bamboo' }, stock: 30, price: 55000 },
        ],
      });

      // Review policy enforcement: status must transition to pending
      expect(updateRes.status).toBe('pending');

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('pending');

      // The unapproved change is now hidden from the public catalog!
      const publicProd = await getProductBySlug(prod!.slug);
      expect(publicProd).toBeNull();

      // Admin re-publishes the product
      await publishProduct(adminUserId, testProductId);
      const [republished] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(republished?.status).toBe('active');
    });

    it('Step 10: Repeated publish or return calls leave consistent idempotent state', async () => {
      // Calling publish on already active product
      const repeatPublish = await publishProduct(adminUserId, testProductId);
      expect(repeatPublish.status).toBe('active');
      expect(repeatPublish.idempotent).toBe(true);

      const [prod] = await db.select().from(products).where(eq(products.id, testProductId));
      expect(prod?.status).toBe('active');
    });
  });

  describe('Inventory Concurrency & Atomic Balance Controls', () => {
    let testInventoryVariantId: string;
    const initialStock = 50;
    const reservedUnits = 15;

    beforeAll(async () => {
      // 1. Create variant with known starting stock = 50
      const invSku = `SKU-INV-CONCUR-${Date.now()}`;
      const { productId } = await createProductDraft(sellerAId, sellerAUserId, {
        title: 'Inventory Concurrency & Reservation Test Product',
        description: 'Used exclusively to benchmark atomic concurrent stock updates and active reservations.',
        categoryId,
        basePrice: 25000,
        moq: 1,
        isB2bEnabled: false,
        images: ['/products/test.webp'],
        variants: [{ sku: invSku, attributes: {}, stock: initialStock, price: 25000 }],
      });
      testProductIdsToClean.push(productId);

      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.sku, invSku));

      testInventoryVariantId = variant!.id;
      testVariantIdsToClean.push(testInventoryVariantId);

      // 2. Insert a PENDING customer order with 15 reserved units
      const orderId = crypto.randomUUID();
      testOrderIdsToClean.push(orderId);

      await db.insert(orders).values({
        id: orderId,
        buyerId: adminUserId,
        type: 'b2c',
        status: 'PENDING',
        subtotal: 375000n,
        deliveryFee: 6000n,
        vat: 0n,
        total: 381000n,
        addressSnapshot: { city: 'Dhaka', address: 'Banani' },
      });

      await db.insert(orderItems).values({
        id: crypto.randomUUID(),
        orderId,
        variantId: testInventoryVariantId,
        sellerId: sellerAId,
        qty: reservedUnits,
        unitPrice: 25000n,
        titleSnapshot: 'Inventory Concurrency & Reservation Test Product',
      });
    });

    it('enforces active reservations and rejects adjustments reducing stock below reserved units', async () => {
      // Starting: on-hand = 50, reserved = 15, available = 35

      // 1. Absolute target stock = 10 (< reserved 15) -> must be rejected
      await expect(
        adjustVariantStock(
          sellerAId,
          sellerAUserId,
          testInventoryVariantId,
          { stock: 10 },
          'Attempt target below reserved'
        )
      ).rejects.toThrow(/reserved/i);

      // 2. Signed delta = -40 (50 - 40 = 10 < reserved 15) -> must be rejected
      await expect(
        adjustVariantStock(
          sellerAId,
          sellerAUserId,
          testInventoryVariantId,
          { delta: -40 },
          'Attempt delta below reserved'
        )
      ).rejects.toThrow(/reserved/i);

      // 3. Negative target stock -> must be rejected
      await expect(
        adjustVariantStock(
          sellerAId,
          sellerAUserId,
          testInventoryVariantId,
          -5,
          'Attempt negative target'
        )
      ).rejects.toThrow(/non-negative/i);

      // 4. Missing / short reason (< 3 chars) -> must be rejected
      await expect(
        adjustVariantStock(
          sellerAId,
          sellerAUserId,
          testInventoryVariantId,
          40,
          'ok'
        )
      ).rejects.toThrow(/at least 3 characters/i);

      // Verify DB stock remains untouched at 50
      const [v] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, testInventoryVariantId));
      expect(v?.stock).toBe(50);

      // Verify 0 audit logs were written for rejected operations
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, testInventoryVariantId));
      expect(logs).toHaveLength(0);
    });

    it('enforces seller authorization and product ownership guards on stock adjustment', async () => {
      // 1. Seller B attempts to adjust Seller A variant -> 403 Forbidden
      if (sellerBId !== sellerAId) {
        await expect(
          adjustVariantStock(
            sellerBId,
            sellerBUserId,
            testInventoryVariantId,
            60,
            'Seller B malicious update'
          )
        ).rejects.toThrow(SellerError);
      }

      // 2. Unapproved seller attempts to adjust -> 403 Unapproved
      await expect(
        adjustVariantStock(
          unapprovedSellerId,
          unapprovedUserId,
          testInventoryVariantId,
          60,
          'Unapproved seller update'
        )
      ).rejects.toThrow(SellerError);

      // Verify DB stock remains untouched at 50
      const [v] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, testInventoryVariantId));
      expect(v?.stock).toBe(50);

      // Verify audit logs remain 0
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, testInventoryVariantId));
      expect(logs).toHaveLength(0);
    });

    it('executes competing signed deltas atomically, applying each accepted delta exactly once to reach exact balance', async () => {
      // Starting stock: 50, reserved: 15
      // 4 concurrent signed operations:
      // op1: +10, op2: -5, op3: +8, op4: -3
      // Net change: +10 - 5 + 8 - 3 = +10
      // Expected final balance: 50 + 10 = 60
      const deltas = [
        { delta: 10, reason: 'Shipment container restock (+10)' },
        { delta: -5, reason: 'Warehouse quality inspection scrap (-5)' },
        { delta: 8, reason: 'Customer return to inventory (+8)' },
        { delta: -3, reason: 'Marketing showroom sample allocation (-3)' },
      ];

      const ops = deltas.map((d) =>
        adjustVariantStock(
          sellerAId,
          sellerAUserId,
          testInventoryVariantId,
          { delta: d.delta },
          d.reason
        )
      );

      const results = await Promise.allSettled(ops);
      const accepted = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(accepted).toHaveLength(4);
      expect(rejected).toHaveLength(0);

      // Exact mathematical balance assertion
      const [finalVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, testInventoryVariantId));

      expect(finalVariant?.stock).toBe(60);

      // Exactly 4 audit log entries written with complete before/after metadata
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, testInventoryVariantId));

      expect(logs).toHaveLength(4);
      for (const log of logs) {
        expect(log.action).toBe('INVENTORY_ADJUSTED');
        expect(log.actorId).toBe(sellerAUserId);
        const meta = log.meta as { delta?: number; previousStock?: number; newStock?: number; reserved?: number };
        expect(meta.reserved).toBe(15);
        expect(meta.delta).toBeDefined();
        expect(meta.newStock).toBe((meta.previousStock ?? 0) + (meta.delta ?? 0));
      }
    });

    it('prevents stale form overwrites under competing absolute targets via optimistic concurrency check', async () => {
      // Current stock in DB is 60.
      // Form A and Form B both read current stock as 60.
      // Form A submits target 75 with expectedPreviousStock: 60
      // Form B submits target 80 with expectedPreviousStock: 60
      const opA = adjustVariantStock(
        sellerAId,
        sellerAUserId,
        testInventoryVariantId,
        { stock: 75, expectedPreviousStock: 60 },
        'Restock to 75 from Tab A'
      );

      const opB = adjustVariantStock(
        sellerAId,
        sellerAUserId,
        testInventoryVariantId,
        { stock: 80, expectedPreviousStock: 60 },
        'Restock to 80 from Tab B'
      );

      const results = await Promise.allSettled([opA, opB]);
      const accepted = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one succeeds, the stale form is rejected with CONCURRENCY_CONFLICT
      expect(accepted).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason as SellerError;
      expect(rejectedError.code).toBe('CONCURRENCY_CONFLICT');
      expect(rejectedError.statusCode).toBe(409);

      // Final stock is either 75 or 80
      const [finalVariant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, testInventoryVariantId));

      expect([75, 80]).toContain(finalVariant?.stock);

      // Total audit logs for this variant increased by exactly 1 (4 from previous test + 1 = 5)
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, testInventoryVariantId));

      expect(logs).toHaveLength(5);
    });
  });
});
