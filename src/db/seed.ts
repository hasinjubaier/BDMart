import { neon } from '@neondatabase/serverless';
import { getDb } from './index';
import {
  users,
  addresses,
  sellers,
  businesses,
  categories,
  products,
  productVariants,
  priceTiers,
  productImages,
} from './schema';
import { assertDevelopmentTarget } from './verify-target';

interface TableCounts {
  users: number;
  addresses: number;
  sellers: number;
  businesses: number;
  categories: number;
  products: number;
  productVariants: number;
  priceTiers: number;
  productImages: number;
}

async function getTableCounts(): Promise<TableCounts> {
  const sql = neon(process.env.DATABASE_URL!);

  const fetchCount = async (tableName: string): Promise<number> => {
    const res = await sql(`SELECT COUNT(*)::int as count FROM ${tableName}`) as [{ count: number }];
    return Number(res[0]?.count || 0);
  };

  return {
    users: await fetchCount('users'),
    addresses: await fetchCount('addresses'),
    sellers: await fetchCount('sellers'),
    businesses: await fetchCount('businesses'),
    categories: await fetchCount('categories'),
    products: await fetchCount('products'),
    productVariants: await fetchCount('product_variants'),
    priceTiers: await fetchCount('price_tiers'),
    productImages: await fetchCount('product_images'),
  };
}

export async function runSeed(): Promise<{ before: TableCounts; after: TableCounts }> {
  console.log('[Seed] Verifying target database branch...');
  const target = await assertDevelopmentTarget();
  console.log(`[Seed] Target verified: Endpoint=${target.endpoint}, Database=${target.database}`);

  const db = getDb();
  const countsBefore = await getTableCounts();
  console.log('[Seed] Counts before seeding:', countsBefore);

  // 1. Seed Users (5 stable users)
  console.log('[Seed] Seeding users...');
  const seedUsers = [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      firebaseUid: 'seed-firebase-seller-01',
      phone: '+8801711000001',
      email: 'seller.bengal@bdmart.com.bd',
      name: 'Mohammad Ali',
      role: 'seller',
      locale: 'en',
    },
    {
      id: 'a0000000-0000-4000-8000-000000000002',
      firebaseUid: 'seed-firebase-seller-02',
      phone: '+8801711000002',
      email: 'seller.jamdani@bdmart.com.bd',
      name: 'Farhana Yasmin',
      role: 'seller',
      locale: 'en',
    },
    {
      id: 'a0000000-0000-4000-8000-000000000003',
      firebaseUid: 'seed-firebase-buyer-b2b',
      phone: '+8801711000003',
      email: 'procurement@dhakaretailers.com',
      name: 'Rafiqul Islam',
      role: 'business_buyer',
      locale: 'en',
    },
    {
      id: 'a0000000-0000-4000-8000-000000000004',
      firebaseUid: 'seed-firebase-buyer-retail',
      phone: '+8801711000004',
      email: 'tanvir.hossain@gmail.com',
      name: 'Tanvir Hossain',
      role: 'buyer',
      locale: 'en',
    },
    {
      id: 'a0000000-0000-4000-8000-000000000005',
      firebaseUid: 'seed-firebase-admin-01',
      phone: '+8801711000005',
      email: 'admin@bdmart.com.bd',
      name: 'BD Mart Platform Admin',
      role: 'admin',
      locale: 'en',
    },
  ];

  for (const u of seedUsers) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  // 2. Seed Addresses
  console.log('[Seed] Seeding addresses...');
  const seedAddresses = [
    {
      id: 'b0000000-0000-4000-8000-000000000001',
      userId: 'a0000000-0000-4000-8000-000000000004', // Tanvir Hossain
      division: 'Sylhet',
      district: 'Sylhet',
      upazila: 'Sylhet Sadar',
      line: 'House 42, Road 7, Block C, Zindabazar',
      phone: '+8801711000004',
      isDefault: true,
    },
    {
      id: 'b0000000-0000-4000-8000-000000000002',
      userId: 'a0000000-0000-4000-8000-000000000003', // Rafiqul Islam
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Motijheel',
      line: 'Suite 802, City Centre Commercial Tower, Motijheel C/A',
      phone: '+8801711000003',
      isDefault: true,
    },
  ];

  for (const a of seedAddresses) {
    await db.insert(addresses).values(a).onConflictDoNothing();
  }

  // 3. Seed Sellers
  console.log('[Seed] Seeding sellers...');
  const seedSellers = [
    {
      id: 'c0000000-0000-4000-8000-000000000001',
      userId: 'a0000000-0000-4000-8000-000000000001',
      shopName: 'Bengal Crafts Ltd',
      tradeLicenseNo: 'TL-DHK-2023-0091',
      tradeLicenseUrl: 'https://storage.bdmart.com.bd/kyc/tl-bengal.pdf',
      nidRef: 'NID-1988269001',
      kycStatus: 'approved',
      commissionRate: 500, // 5.00%
    },
    {
      id: 'c0000000-0000-4000-8000-000000000002',
      userId: 'a0000000-0000-4000-8000-000000000002',
      shopName: 'Jamdani & Silk Emporium',
      tradeLicenseNo: 'TL-NRG-2022-0442',
      tradeLicenseUrl: 'https://storage.bdmart.com.bd/kyc/tl-jamdani.pdf',
      nidRef: 'NID-1992269002',
      kycStatus: 'approved',
      commissionRate: 500, // 5.00%
    },
  ];

  for (const s of seedSellers) {
    await db.insert(sellers).values(s).onConflictDoNothing();
  }

  // 4. Seed Businesses
  console.log('[Seed] Seeding businesses...');
  const seedBusinesses = [
    {
      id: 'd0000000-0000-4000-8000-000000000001',
      userId: 'a0000000-0000-4000-8000-000000000003',
      companyName: 'Dhaka Retailers Group Ltd',
      tin: 'TIN-1029384756',
      bin: 'BIN-9876543210',
      verifiedAt: new Date('2026-01-15T00:00:00Z'),
    },
  ];

  for (const b of seedBusinesses) {
    await db.insert(businesses).values(b).onConflictDoNothing();
  }

  // 5. Seed 10 Categories
  console.log('[Seed] Seeding 10 categories...');
  const seedCategories = [
    {
      id: 'e0000000-0000-4000-8000-000000000001',
      slug: 'jute-eco-crafts',
      nameBn: 'Jute & Eco Crafts',
      nameEn: 'Jute & Eco Crafts',
      sortOrder: 1,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000002',
      slug: 'handlooms-jamdani',
      nameBn: 'Traditional Handlooms & Jamdani',
      nameEn: 'Traditional Handlooms & Jamdani',
      sortOrder: 2,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000003',
      slug: 'grocery-food',
      nameBn: 'Grocery & Native Essentials',
      nameEn: 'Grocery & Native Essentials',
      sortOrder: 3,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000004',
      slug: 'rmg-apparel',
      nameBn: 'RMG & Apparel',
      nameEn: 'RMG & Apparel',
      sortOrder: 4,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000005',
      slug: 'leather-goods',
      nameBn: 'Pure Leather Goods',
      nameEn: 'Pure Leather Goods',
      sortOrder: 5,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000006',
      slug: 'agriculture-spices',
      nameBn: 'Agriculture & Organic Spices',
      nameEn: 'Agriculture & Organic Spices',
      sortOrder: 6,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000007',
      slug: 'electronics-gadgets',
      nameBn: 'Electronics & Smart Gadgets',
      nameEn: 'Electronics & Smart Gadgets',
      sortOrder: 7,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000008',
      slug: 'home-living',
      nameBn: 'Home Living & Brass Crafts',
      nameEn: 'Home Living & Brass Crafts',
      sortOrder: 8,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000009',
      slug: 'herbal-care',
      nameBn: 'Natural Beauty & Herbal Care',
      nameEn: 'Natural Beauty & Herbal Care',
      sortOrder: 9,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000010',
      slug: 'industrial-hardware',
      nameBn: 'Industrial Hardware & Safety',
      nameEn: 'Industrial Hardware & Safety',
      sortOrder: 10,
    },
  ];

  for (const c of seedCategories) {
    await db.insert(categories).values(c).onConflictDoNothing();
  }

  // 6. Seed 50 Products (5 per category across all 10 categories)
  console.log('[Seed] Seeding 50 products and variants...');
  const catIds = seedCategories.map((c) => c.id);
  const sellerBengalId = seedSellers[0]!.id;
  const sellerJamdaniId = seedSellers[1]!.id;

  interface ProductDef {
    index: number;
    catIndex: number;
    sellerId: string;
    slug: string;
    titleBn: string;
    titleEn: string;
    desc: string;
    basePrice: bigint; // poisha
    moq: number;
    isB2b: boolean;
    sku: string;
    stock: number;
    attributes: Record<string, unknown>;
    tiers?: Array<{ minQty: number; unitPrice: bigint }>;
    image: string;
  }

  const rawProducts: ProductDef[] = [
    // Category 1: Jute & Eco Crafts (indices 1 to 5)
    {
      index: 1,
      catIndex: 0,
      sellerId: sellerBengalId,
      slug: 'eco-jute-tote-bag',
      titleBn: 'Premium Eco Handcrafted Jute Tote Bag',
      titleEn: 'Premium Eco Handcrafted Jute Tote Bag',
      desc: 'Handmade biodegradable golden jute tote bag crafted by rural artisans in Jamalpur. High durability with reinforced cotton handles.',
      basePrice: 35000n, // BDT 350
      moq: 50,
      isB2b: true,
      sku: 'SKU-JUTE-BAG-001',
      stock: 105,
      attributes: { color: 'Natural Golden', size: 'Large', material: '100% Export Grade Jute' },
      tiers: [
        { minQty: 50, unitPrice: 28000n },  // BDT 280
        { minQty: 100, unitPrice: 22000n }, // BDT 220
        { minQty: 500, unitPrice: 18000n }, // BDT 180
      ],
      image: '/products/jute-bag-natural.webp',
    },
    {
      index: 2,
      catIndex: 0,
      sellerId: sellerBengalId,
      slug: 'braided-jute-floor-mat',
      titleBn: 'Hand-braided Natural Jute Floor Rug (3x5 ft)',
      titleEn: 'Hand-braided Natural Jute Floor Rug (3x5 ft)',
      desc: 'Eco-friendly handwoven braided circular floor mat crafted from bleached and dyed golden jute fibers.',
      basePrice: 85000n, // BDT 850
      moq: 20,
      isB2b: true,
      sku: 'SKU-JUTE-MAT-002',
      stock: 60,
      attributes: { dimensions: '3x5 ft', weave: 'Braided Circular', color: 'Natural/Beige' },
      tiers: [
        { minQty: 20, unitPrice: 70000n },
        { minQty: 50, unitPrice: 60000n },
      ],
      image: '/products/jute-rug-braided.webp',
    },
    {
      index: 3,
      catIndex: 0,
      sellerId: sellerBengalId,
      slug: 'jute-burlap-hessian-sack',
      titleBn: 'Heavy Duty Export Grade Burlap Sack (50kg Capacity)',
      titleEn: 'Heavy Duty Export Grade Burlap Sack (50kg Capacity)',
      desc: 'Standard agricultural packaging hessian burlap bags for food grain, potato, and agricultural storage.',
      basePrice: 12000n, // BDT 120
      moq: 100,
      isB2b: true,
      sku: 'SKU-JUTE-SACK-003',
      stock: 1500,
      attributes: { capacity: '50kg', weight: '850 grams', grade: 'Grade A Burlap' },
      tiers: [
        { minQty: 100, unitPrice: 9500n },
        { minQty: 500, unitPrice: 8500n },
        { minQty: 1000, unitPrice: 7500n },
      ],
      image: '/products/jute-sack-burlap.webp',
    },
    {
      index: 4,
      catIndex: 0,
      sellerId: sellerBengalId,
      slug: 'jute-table-runner-set',
      titleBn: 'Artisan Decorative Jute Table Runner & Placemat Set',
      titleEn: 'Artisan Decorative Jute Table Runner & Placemat Set',
      desc: 'Handcrafted floral embroidered table runner with 6 matching placemats for festive home dining.',
      basePrice: 45000n, // BDT 450
      moq: 1,
      isB2b: false,
      sku: 'SKU-JUTE-RUN-004',
      stock: 40,
      attributes: { pieces: '1 Runner + 6 Mats', embroidery: 'Traditional Kantha Stitch' },
      image: '/products/jute-table-runner.webp',
    },
    {
      index: 5,
      catIndex: 0,
      sellerId: sellerBengalId,
      slug: 'jute-rope-plant-basket',
      titleBn: 'Cylindrical Jute Rope Storage & Planter Basket',
      titleEn: 'Cylindrical Jute Rope Storage & Planter Basket',
      desc: 'Sturdy cotton and jute rope stitched indoor storage basket with soft carrying handles.',
      basePrice: 32000n, // BDT 320
      moq: 15,
      isB2b: true,
      sku: 'SKU-JUTE-BASK-005',
      stock: 85,
      attributes: { diameter: '12 inch', height: '14 inch', handles: 'Dual Rope' },
      tiers: [
        { minQty: 15, unitPrice: 26000n },
        { minQty: 50, unitPrice: 21000n },
      ],
      image: '/products/jute-basket-planter.webp',
    },

    // Category 2: Traditional Handlooms & Jamdani (indices 6 to 10)
    {
      index: 6,
      catIndex: 1,
      sellerId: sellerJamdaniId,
      slug: 'dhakai-jamdani-saree-84count',
      titleBn: 'Authentic Handwoven Heritage Dhakai Jamdani Saree (84 Count)',
      titleEn: 'Authentic Handwoven Heritage Dhakai Jamdani Saree (84 Count)',
      desc: 'Handwoven in Narayanganj by master weavers over 45 days. Exquisite traditional floral buta motifs.',
      basePrice: 850000n, // BDT 8,500
      moq: 1,
      isB2b: false,
      sku: 'SKU-JAMDANI-006',
      stock: 12,
      attributes: { count: '84 Count Cotton/Zari', color: 'Midnight Blue & Antique Gold', origin: 'Rupganj' },
      image: '/products/dhakai-jamdani-saree.webp',
    },
    {
      index: 7,
      catIndex: 1,
      sellerId: sellerJamdaniId,
      slug: 'tangail-pure-cotton-saree',
      titleBn: 'Traditional Tangail Handloom Pure Cotton Saree',
      titleEn: 'Traditional Tangail Handloom Pure Cotton Saree',
      desc: 'Cool, breathable summer cotton saree handwoven on traditional pit looms in Pathrail, Tangail.',
      basePrice: 185000n, // BDT 1,850
      moq: 10,
      isB2b: true,
      sku: 'SKU-TANGAIL-007',
      stock: 50,
      attributes: { fabric: '100% Combed Cotton', length: '12 Haat with Blouse Piece', pattern: 'Striped Border' },
      tiers: [
        { minQty: 10, unitPrice: 150000n },
        { minQty: 30, unitPrice: 135000n },
      ],
      image: '/products/tangail-cotton-saree.webp',
    },
    {
      index: 8,
      catIndex: 1,
      sellerId: sellerJamdaniId,
      slug: 'rajshahi-pure-silk-saree',
      titleBn: 'Premium Rajshahi Mulberry Pure Silk Saree',
      titleEn: 'Premium Rajshahi Mulberry Pure Silk Saree',
      desc: 'Certified Rajshahi pure mulberry silk with rich printed pallu and glossy handloom texture.',
      basePrice: 950000n, // BDT 9,500
      moq: 1,
      isB2b: false,
      sku: 'SKU-SILK-008',
      stock: 8,
      attributes: { silkGrade: 'Mulberry Grade A', color: 'Deep Maroon & Gold', silkMarkCertified: true },
      image: '/products/rajshahi-silk-saree.webp',
    },
    {
      index: 9,
      catIndex: 1,
      sellerId: sellerJamdaniId,
      slug: 'khadi-cotton-punjabi',
      titleBn: 'Hand-spun Cumilla Khadi Casual Men Punjabi',
      titleEn: 'Hand-spun Cumilla Khadi Casual Men Punjabi',
      desc: 'Eco-conscious hand-spun, handwoven traditional Khadi kurta with shell button placket.',
      basePrice: 165000n, // BDT 1,650
      moq: 20,
      isB2b: true,
      sku: 'SKU-KHADI-009',
      stock: 75,
      attributes: { size: '40, 42, 44', fabric: 'Pure Cumilla Khadi Cotton', style: 'Semi-long' },
      tiers: [
        { minQty: 20, unitPrice: 135000n },
        { minQty: 50, unitPrice: 120000n },
      ],
      image: '/products/khadi-mens-punjabi.webp',
    },
    {
      index: 10,
      catIndex: 1,
      sellerId: sellerJamdaniId,
      slug: 'manipuri-handloom-shawl',
      titleBn: 'Handwoven Sylheti Manipuri Pattern Winter Shawl',
      titleEn: 'Handwoven Sylheti Manipuri Pattern Winter Shawl',
      desc: 'Intricate ethnic geometric patterns woven on traditional loin-looms by Manipuri artisans in Moulvibazar.',
      basePrice: 145000n, // BDT 1,450
      moq: 1,
      isB2b: false,
      sku: 'SKU-SHAWL-010',
      stock: 30,
      attributes: { weave: 'Manipuri Ethnic Loom', material: 'Soft Acrylic/Cotton Blend', size: 'Full Winter Shawl' },
      image: '/products/manipuri-winter-shawl.webp',
    },

    // Category 3: Grocery & Native Essentials (indices 11 to 15)
    {
      index: 11,
      catIndex: 2,
      sellerId: sellerBengalId,
      slug: 'dinajpur-chinigura-rice-5kg',
      titleBn: 'Aromatic Dinajpur Premium Chinigura Rice (5kg Bag)',
      titleEn: 'Aromatic Dinajpur Premium Chinigura Rice (5kg Bag)',
      desc: 'Naturally aged sweet-scented small grain Chinigura rice, ideal for royal biryani, polao, and festive payesh.',
      basePrice: 65000n, // BDT 650
      moq: 10,
      isB2b: true,
      sku: 'SKU-RICE-011',
      stock: 200,
      attributes: { netWeight: '5 Kilograms', aging: '1 Year Natural Aged', grainType: 'Small Aromatic' },
      tiers: [
        { minQty: 10, unitPrice: 58000n },
        { minQty: 50, unitPrice: 52000n },
      ],
      image: '/products/chinigura-rice-5kg.webp',
    },
    {
      index: 12,
      catIndex: 2,
      sellerId: sellerBengalId,
      slug: 'pure-sundarbans-wild-honey-500g',
      titleBn: 'Pure Natural Raw Sundarbans Mangrove Honey (500g Glass Jar)',
      titleEn: 'Pure Natural Raw Sundarbans Mangrove Honey (500g Glass Jar)',
      desc: 'Raw unprocessed wild honey collected directly from Sundarbans mangrove forests during blooming season.',
      basePrice: 75000n, // BDT 750
      moq: 12,
      isB2b: true,
      sku: 'SKU-HONEY-012',
      stock: 120,
      attributes: { floralSource: 'Khalisha Flower', processing: 'Raw Cold Filtered', netWeight: '500g' },
      tiers: [
        { minQty: 12, unitPrice: 62000n },
        { minQty: 48, unitPrice: 55000n },
      ],
      image: '/products/sundarbans-honey-jar.webp',
    },
    {
      index: 13,
      catIndex: 2,
      sellerId: sellerBengalId,
      slug: 'cold-pressed-mustard-oil-1l',
      titleBn: 'Pure Wooden Ghani Cold-Pressed Mustard Oil (1L Bottle)',
      titleEn: 'Pure Wooden Ghani Cold-Pressed Mustard Oil (1L Bottle)',
      desc: 'Traditional cold-pressed pungent mustard oil extracted at low temperature preserving natural aroma and allyl isothiocyanate.',
      basePrice: 32000n, // BDT 320
      moq: 24,
      isB2b: true,
      sku: 'SKU-OIL-013',
      stock: 350,
      attributes: { extraction: 'Wooden Cold-Ghani', pungency: 'High Natural Pungent', volume: '1 Liter' },
      tiers: [
        { minQty: 24, unitPrice: 28000n },
        { minQty: 120, unitPrice: 25000n },
      ],
      image: '/products/mustard-oil-bottle.webp',
    },
    {
      index: 14,
      catIndex: 2,
      sellerId: sellerBengalId,
      slug: 'natore-kachagolla-box-1kg',
      titleBn: 'Traditional Authentic Natore Special Kachagolla (1kg Gift Box)',
      titleEn: 'Traditional Authentic Natore Special Kachagolla (1kg Gift Box)',
      desc: 'Freshly prepared traditional sweetmeat from pure cow milk chhana, packed in hygiene-sealed gift box.',
      basePrice: 55000n, // BDT 550
      moq: 1,
      isB2b: false,
      sku: 'SKU-SWEET-014',
      stock: 25,
      attributes: { shelfLife: '4 Days Ambient / 10 Days Refrigerated', netWeight: '1 Kilogram' },
      image: '/products/natore-kachagolla.webp',
    },
    {
      index: 15,
      catIndex: 2,
      sellerId: sellerBengalId,
      slug: 'magura-khejur-gur-patali-1kg',
      titleBn: 'Pure Winter Date Palm Jaggery Patali Gur (1kg Cake)',
      titleEn: 'Pure Winter Date Palm Jaggery Patali Gur (1kg Cake)',
      desc: 'Unadulterated crystal date palm jaggery boiled over wood fire in traditional clay ovens in Magura.',
      basePrice: 48000n, // BDT 480
      moq: 10,
      isB2b: true,
      sku: 'SKU-GUR-015',
      stock: 90,
      attributes: { season: 'Winter Harvest 2026', purity: '100% Sugar-Free Date Juice', weight: '1kg Solid Cake' },
      tiers: [
        { minQty: 10, unitPrice: 40000n },
        { minQty: 50, unitPrice: 35000n },
      ],
      image: '/products/khejur-patali-gur.webp',
    },

    // Category 4: RMG & Apparel (indices 16 to 20)
    {
      index: 16,
      catIndex: 3,
      sellerId: sellerJamdaniId,
      slug: 'combed-cotton-tshirt-crew',
      titleBn: '180 GSM 100% Combed Cotton Solid Crew T-Shirt',
      titleEn: '180 GSM 100% Combed Cotton Solid Crew T-Shirt',
      desc: 'Export surplus ultra-soft pre-shrunk combed cotton t-shirt with lycra ribbed collar.',
      basePrice: 38000n, // BDT 380
      moq: 50,
      isB2b: true,
      sku: 'SKU-TSHIRT-016',
      stock: 800,
      attributes: { gsm: '180 GSM', colors: 'Black, White, Navy, Heather Grey', fit: 'Regular Export Fit' },
      tiers: [
        { minQty: 50, unitPrice: 29000n },
        { minQty: 200, unitPrice: 24000n },
        { minQty: 500, unitPrice: 20000n },
      ],
      image: '/products/cotton-crew-tshirt.webp',
    },
    {
      index: 17,
      catIndex: 3,
      sellerId: sellerJamdaniId,
      slug: 'denim-jeans-regular-fit',
      titleBn: 'Export Quality Indigo Washed Denim Jeans (Regular Fit)',
      titleEn: 'Export Quality Indigo Washed Denim Jeans (Regular Fit)',
      desc: 'Heavy 12.5 oz comfort stretch denim with durable YKK zipper and triple-needle chain stitching.',
      basePrice: 125000n, // BDT 1,250
      moq: 25,
      isB2b: true,
      sku: 'SKU-JEANS-017',
      stock: 250,
      attributes: { weight: '12.5 oz Denim', wash: 'Vintage Enzyme Wash', waistSizes: '30, 32, 34, 36, 38' },
      tiers: [
        { minQty: 25, unitPrice: 98000n },
        { minQty: 100, unitPrice: 85000n },
      ],
      image: '/products/denim-jeans-indigo.webp',
    },
    {
      index: 18,
      catIndex: 3,
      sellerId: sellerJamdaniId,
      slug: 'women-viscose-kurti',
      titleBn: 'Casual Printed Viscose Flared Kurti for Women',
      titleEn: 'Casual Printed Viscose Flared Kurti for Women',
      desc: 'Lightweight breathable rayon viscose stitched kurti with modern block print motifs.',
      basePrice: 85000n, // BDT 850
      moq: 1,
      isB2b: false,
      sku: 'SKU-KURTI-018',
      stock: 45,
      attributes: { material: 'Rayon Viscose', sleeve: 'Three-Quarter', length: 'Knee-length' },
      image: '/products/womens-viscose-kurti.webp',
    },
    {
      index: 19,
      catIndex: 3,
      sellerId: sellerJamdaniId,
      slug: 'heavy-fleece-hoodie',
      titleBn: '320 GSM Winter Fleece Pullover Hoodie (Unisex)',
      titleEn: '320 GSM Winter Fleece Pullover Hoodie (Unisex)',
      desc: 'Brushed inside thermal cotton fleece pullover hoodie with front kangaroo pocket.',
      basePrice: 145000n, // BDT 1,450
      moq: 20,
      isB2b: true,
      sku: 'SKU-HOODIE-019',
      stock: 180,
      attributes: { gsm: '320 GSM Brushed Fleece', colors: 'Charcoal, Olive, Burgundy' },
      tiers: [
        { minQty: 20, unitPrice: 115000n },
        { minQty: 100, unitPrice: 95000n },
      ],
      image: '/products/fleece-winter-hoodie.webp',
    },
    {
      index: 20,
      catIndex: 3,
      sellerId: sellerJamdaniId,
      slug: 'cotton-polo-shirt-solid',
      titleBn: '220 GSM Pique Cotton Classic Polo Shirt',
      titleEn: '220 GSM Pique Cotton Classic Polo Shirt',
      desc: 'Export grade double-pique knitted polo shirt with mother-of-pearl buttons and flat-knit collar.',
      basePrice: 58000n, // BDT 580
      moq: 30,
      isB2b: true,
      sku: 'SKU-POLO-020',
      stock: 400,
      attributes: { knit: 'Double Pique 220 GSM', fit: 'Smart Casual Fit' },
      tiers: [
        { minQty: 30, unitPrice: 46000n },
        { minQty: 150, unitPrice: 39000n },
      ],
      image: '/products/pique-polo-shirt.webp',
    },

    // Category 5: Pure Leather Goods (indices 21 to 25)
    {
      index: 21,
      catIndex: 4,
      sellerId: sellerBengalId,
      slug: 'full-grain-leather-wallet',
      titleBn: 'Genuine Full Grain Bifold Leather Wallet with RFID Shield',
      titleEn: 'Genuine Full Grain Bifold Leather Wallet with RFID Shield',
      desc: 'Top grain cowhide leather handcrafted wallet featuring 8 card slots, dual currency sleeves, and RFID protection.',
      basePrice: 95000n, // BDT 950
      moq: 20,
      isB2b: true,
      sku: 'SKU-WALLET-021',
      stock: 150,
      attributes: { leatherType: 'Full Grain Cowhide', color: 'Cognac Brown', rfidProtected: true },
      tiers: [
        { minQty: 20, unitPrice: 75000n },
        { minQty: 100, unitPrice: 62000n },
      ],
      image: '/products/leather-wallet-brown.webp',
    },
    {
      index: 22,
      catIndex: 4,
      sellerId: sellerBengalId,
      slug: 'leather-executive-laptop-bag',
      titleBn: 'Handcrafted Formal Cowhide Leather Laptop Briefcase (15.6 inch)',
      titleEn: 'Handcrafted Formal Cowhide Leather Laptop Briefcase (15.6 inch)',
      desc: 'Premium vegetable-tanned leather briefcase with padded laptop sleeve, antique brass hardware, and detachable strap.',
      basePrice: 420000n, // BDT 4,200
      moq: 5,
      isB2b: true,
      sku: 'SKU-LAPBAG-022',
      stock: 35,
      attributes: { compatibility: 'Up to 15.6 inch Laptop', tanning: 'Vegetable Tanned Leather', hardware: 'Solid Brass' },
      tiers: [
        { minQty: 5, unitPrice: 350000n },
        { minQty: 20, unitPrice: 300000n },
      ],
      image: '/products/leather-laptop-bag.webp',
    },
    {
      index: 23,
      catIndex: 4,
      sellerId: sellerBengalId,
      slug: 'leather-formal-oxford-shoes',
      titleBn: 'Men Pure Leather Hand-Stitched Oxford Shoes',
      titleEn: 'Men Pure Leather Hand-Stitched Oxford Shoes',
      desc: 'Handmade Goodyear welted full grain leather formal shoes with cushioned leather insole and non-slip rubber heel.',
      basePrice: 385000n, // BDT 3,850
      moq: 1,
      isB2b: false,
      sku: 'SKU-SHOES-023',
      stock: 28,
      attributes: { construction: 'Goodyear Welted', sole: 'Leather & Rubber Composite', color: 'Classic Black' },
      image: '/products/leather-oxford-shoes.webp',
    },
    {
      index: 24,
      catIndex: 4,
      sellerId: sellerBengalId,
      slug: 'leather-reversible-belt',
      titleBn: 'Genuine Leather Formal Reversible Belt (Black/Brown)',
      titleEn: 'Genuine Leather Formal Reversible Belt (Black/Brown)',
      desc: 'Single piece 35mm wide full grain leather belt with rotating alloy buckle for versatile formal styling.',
      basePrice: 65000n, // BDT 650
      moq: 25,
      isB2b: true,
      sku: 'SKU-BELT-024',
      stock: 190,
      attributes: { width: '35mm', style: 'Reversible Black/Dark Brown', buckle: 'Gunmetal Alloy' },
      tiers: [
        { minQty: 25, unitPrice: 48000n },
        { minQty: 100, unitPrice: 39000n },
      ],
      image: '/products/leather-reversible-belt.webp',
    },
    {
      index: 25,
      catIndex: 4,
      sellerId: sellerBengalId,
      slug: 'leather-travel-duffel-bag',
      titleBn: 'Vintage Rugged Full-Grain Leather Travel Duffel (45L)',
      titleEn: 'Vintage Rugged Full-Grain Leather Travel Duffel (45L)',
      desc: 'Spacious weekend travel duffel bag made of distressed oil-pull up cowhide leather with heavy cotton canvas lining.',
      basePrice: 550000n, // BDT 5,500
      moq: 1,
      isB2b: false,
      sku: 'SKU-DUFFEL-025',
      stock: 15,
      attributes: { capacity: '45 Liters', leatherFinish: 'Crazy Horse Oil Pull-up', dimensions: '22 x 11 x 10 inches' },
      image: '/products/leather-travel-duffel.webp',
    },

    // Category 6: Agriculture & Organic Spices (indices 26 to 30)
    {
      index: 26,
      catIndex: 5,
      sellerId: sellerBengalId,
      slug: 'organic-kurigram-turmeric-powder-500g',
      titleBn: 'Pure Stone-Ground Kurigram Organic Turmeric (500g)',
      titleEn: 'Pure Stone-Ground Kurigram Organic Turmeric (500g)',
      desc: 'High-curcumin organic turmeric sun-dried and slowly stone ground without artificial lead chromate polish.',
      basePrice: 24000n, // BDT 240
      moq: 20,
      isB2b: true,
      sku: 'SKU-TURM-026',
      stock: 300,
      attributes: { curcuminContent: '4.8% Active Curcumin', grinding: 'Traditional Stone Chaki', weight: '500g Pouch' },
      tiers: [
        { minQty: 20, unitPrice: 19000n },
        { minQty: 100, unitPrice: 16000n },
      ],
      image: '/products/organic-turmeric-powder.webp',
    },
    {
      index: 27,
      catIndex: 5,
      sellerId: sellerBengalId,
      slug: 'panchagarh-organic-black-tea-400g',
      titleBn: 'High Grown Organic CTC Black Tea Leaf (400g Foil Pack)',
      titleEn: 'High Grown Organic CTC Black Tea Leaf (400g Foil Pack)',
      desc: 'Pesticide-free bold CTC tea from flatland organic gardens of Panchagarh with rich liquor and malty flavor.',
      basePrice: 35000n, // BDT 350
      moq: 24,
      isB2b: true,
      sku: 'SKU-TEA-027',
      stock: 220,
      attributes: { grade: 'BOP / OF Premium Blend', packaging: 'Vacuum Sealed Nitrogen Foil', weight: '400g' },
      tiers: [
        { minQty: 24, unitPrice: 28000n },
        { minQty: 120, unitPrice: 24000n },
      ],
      image: '/products/panchagarh-black-tea.webp',
    },
    {
      index: 28,
      catIndex: 5,
      sellerId: sellerBengalId,
      slug: 'organic-chia-seeds-500g',
      titleBn: 'Premium Cleaned Superfood Chia Seeds (500g Zip Pack)',
      titleEn: 'Premium Cleaned Superfood Chia Seeds (500g Zip Pack)',
      desc: 'Triple-cleaned raw black chia seeds loaded with plant omega-3, dietary fiber, and essential minerals.',
      basePrice: 45000n, // BDT 450
      moq: 1,
      isB2b: false,
      sku: 'SKU-CHIA-028',
      stock: 80,
      attributes: { purity: '99.9% Cleaned', packaging: 'Standup Resealable Pouch', weight: '500g' },
      image: '/products/organic-chia-seeds.webp',
    },
    {
      index: 29,
      catIndex: 5,
      sellerId: sellerBengalId,
      slug: 'dry-red-chilli-powder-500g',
      titleBn: 'Sun-Dried Bogura Hot Red Chilli Powder (500g)',
      titleEn: 'Sun-Dried Bogura Hot Red Chilli Powder (500g)',
      desc: 'Authentic fiery red chilli dried under northern sunshine and hygienically pulverized for bold cooking color and heat.',
      basePrice: 28000n, // BDT 280
      moq: 20,
      isB2b: true,
      sku: 'SKU-CHILLI-029',
      stock: 260,
      attributes: { origin: 'Sariakandi, Bogura', scoville: 'High Pungency Grade', weight: '500g' },
      tiers: [
        { minQty: 20, unitPrice: 22000n },
        { minQty: 100, unitPrice: 18000n },
      ],
      image: '/products/bogura-red-chilli.webp',
    },
    {
      index: 30,
      catIndex: 5,
      sellerId: sellerBengalId,
      slug: 'organic-kalijira-seed-250g',
      titleBn: 'Cleaned Natural Organic Black Cumin / Nigella Seed (250g)',
      titleEn: 'Cleaned Natural Organic Black Cumin / Nigella Seed (250g)',
      desc: 'Machine cleaned small-grain natural black seed with high thymoquinone essential oil profile.',
      basePrice: 22000n, // BDT 220
      moq: 15,
      isB2b: true,
      sku: 'SKU-KALIJ-030',
      stock: 140,
      attributes: { variety: 'Bangladeshi Deshi Kalijira', cleanliness: '100% Machine Cleaned', weight: '250g' },
      tiers: [
        { minQty: 15, unitPrice: 17000n },
        { minQty: 60, unitPrice: 14000n },
      ],
      image: '/products/organic-black-cumin.webp',
    },

    // Category 7: Electronics & Smart Gadgets (indices 31 to 35)
    {
      index: 31,
      catIndex: 6,
      sellerId: sellerJamdaniId,
      slug: 'fast-charging-power-bank-20000mah',
      titleBn: '22.5W Super Fast Charging 20,000mAh Power Bank with Digital Display',
      titleEn: '22.5W Super Fast Charging 20,000mAh Power Bank with Digital Display',
      desc: 'High-density Li-Polymer battery pack with dual USB-A QC 3.0 and bidirectional Type-C 20W PD output.',
      basePrice: 185000n, // BDT 1,850
      moq: 10,
      isB2b: true,
      sku: 'SKU-PWRBNK-031',
      stock: 110,
      attributes: { batteryCapacity: '20,000mAh 74Wh', ports: '2x USB-A, 1x USB-C', display: 'LED Battery % Monitor' },
      tiers: [
        { minQty: 10, unitPrice: 150000n },
        { minQty: 50, unitPrice: 135000n },
      ],
      image: '/products/fast-powerbank-20k.webp',
    },
    {
      index: 32,
      catIndex: 6,
      sellerId: sellerJamdaniId,
      slug: 'tws-wireless-earbuds-anc',
      titleBn: 'Active Noise Cancelling Bluetooth 5.3 TWS Earbuds (32h Playtime)',
      titleEn: 'Active Noise Cancelling Bluetooth 5.3 TWS Earbuds (32h Playtime)',
      desc: 'Hybrid 35dB ANC earphones with 10mm titanium composite dynamic drivers and quad-mic ENC call clarity.',
      basePrice: 165000n, // BDT 1,650
      moq: 1,
      isB2b: false,
      sku: 'SKU-EARBUD-032',
      stock: 65,
      attributes: { noiseCancellation: '35dB Hybrid ANC', bluetooth: 'v5.3 Low Latency 40ms', waterproof: 'IPX5' },
      image: '/products/tws-anc-earbuds.webp',
    },
    {
      index: 33,
      catIndex: 6,
      sellerId: sellerJamdaniId,
      slug: 'braided-type-c-cable-65w',
      titleBn: 'High-Speed 65W PD Braided Fast Charging USB-C Cable (1.2m)',
      titleEn: 'High-Speed 65W PD Braided Fast Charging USB-C Cable (1.2m)',
      desc: 'Reinforced nylon braided Type-C to Type-C cable with E-marker chip supporting high-speed laptop and phone fast charging.',
      basePrice: 25000n, // BDT 250
      moq: 50,
      isB2b: true,
      sku: 'SKU-CABLE-033',
      stock: 500,
      attributes: { wattage: '65W Power Delivery', length: '1.2 Meters', material: 'Ballistic Nylon Braided' },
      tiers: [
        { minQty: 50, unitPrice: 17000n },
        { minQty: 200, unitPrice: 13000n },
      ],
      image: '/products/braided-typec-cable.webp',
    },
    {
      index: 34,
      catIndex: 6,
      sellerId: sellerJamdaniId,
      slug: 'smart-health-fitness-band',
      titleBn: 'AMOLED Display Heart Rate & SpO2 Fitness Tracker Band',
      titleEn: 'AMOLED Display Heart Rate & SpO2 Fitness Tracker Band',
      desc: '1.47-inch colorful AMOLED fitness band with continuous heart rate, blood oxygen monitor, and 5 ATM water resistance.',
      basePrice: 245000n, // BDT 2,450
      moq: 1,
      isB2b: false,
      sku: 'SKU-FITBAND-034',
      stock: 40,
      attributes: { screen: '1.47 inch AMOLED', waterResistance: '5 ATM (50m)', batteryLife: 'Up to 14 Days' },
      image: '/products/smart-fitness-band.webp',
    },
    {
      index: 35,
      catIndex: 6,
      sellerId: sellerJamdaniId,
      slug: 'led-desk-lamp-wireless-charger',
      titleBn: 'Touch Dimmable Reading LED Lamp with 15W Qi Wireless Charging Pad',
      titleEn: 'Touch Dimmable Reading LED Lamp with 15W Qi Wireless Charging Pad',
      desc: 'Eye-friendly multi-angle adjustable LED lamp with 3 color temperatures, dimmer touch slider, and fast wireless charging base.',
      basePrice: 195000n, // BDT 1,950
      moq: 10,
      isB2b: true,
      sku: 'SKU-DESKLMP-035',
      stock: 55,
      attributes: { wirelessOutput: '15W Fast Qi Pad', brightnessModes: 'Warm, Cool, Natural Light (5 Levels)' },
      tiers: [
        { minQty: 10, unitPrice: 160000n },
        { minQty: 30, unitPrice: 140000n },
      ],
      image: '/products/led-wireless-desk-lamp.webp',
    },

    // Category 8: Home Living & Brass Crafts (indices 36 to 40)
    {
      index: 36,
      catIndex: 7,
      sellerId: sellerBengalId,
      slug: 'handcrafted-brass-water-pitcher',
      titleBn: 'Dhamrai Heritage Hand-Cast Brass Water Pitcher (3L Capacity)',
      titleEn: 'Dhamrai Heritage Hand-Cast Brass Water Pitcher (3L Capacity)',
      desc: 'Traditional sand-cast brass water pitcher handcrafted by master artisans in Dhamrai with natural antibacterial properties.',
      basePrice: 385000n, // BDT 3,850
      moq: 1,
      isB2b: false,
      sku: 'SKU-BRASS-036',
      stock: 20,
      attributes: { weight: '1.8 kg Brass', capacity: '3 Liters', craftingMethod: 'Dhamrai Sand Casting' },
      image: '/products/brass-water-pitcher.webp',
    },
    {
      index: 37,
      catIndex: 7,
      sellerId: sellerBengalId,
      slug: 'clay-earthenware-dinner-set',
      titleBn: 'Bijoypur Handcrafted Ceramic Terracotta Dining Set (12 pcs)',
      titleEn: 'Bijoypur Handcrafted Ceramic Terracotta Dining Set (12 pcs)',
      desc: 'Glazed earthenware dinnerware crafted from natural white clay of Susang Durgapur, Netrokona.',
      basePrice: 295000n, // BDT 2,950
      moq: 1,
      isB2b: false,
      sku: 'SKU-CLAY-037',
      stock: 18,
      attributes: { setContains: '4 Plates, 4 Bowls, 4 Tumblers', glaze: 'Food-Grade Non-Toxic Glazed' },
      image: '/products/clay-dinner-set.webp',
    },
    {
      index: 38,
      catIndex: 7,
      sellerId: sellerBengalId,
      slug: 'cane-bamboo-laundry-hamper',
      titleBn: 'Traditional Eco Cane & Bamboo Woven Laundry Basket with Lid',
      titleEn: 'Traditional Eco Cane & Bamboo Woven Laundry Basket with Lid',
      desc: 'Durable, naturally ventilated woven cane hamper crafted in Sylhet with breathable cotton inner lining.',
      basePrice: 115000n, // BDT 1,150
      moq: 10,
      isB2b: true,
      sku: 'SKU-CANE-038',
      stock: 45,
      attributes: { material: 'Natural Polished Rattan Cane & Bamboo', height: '22 inches', diameter: '15 inches' },
      tiers: [
        { minQty: 10, unitPrice: 92000n },
        { minQty: 40, unitPrice: 78000n },
      ],
      image: '/products/cane-laundry-basket.webp',
    },
    {
      index: 39,
      catIndex: 7,
      sellerId: sellerBengalId,
      slug: 'nakshi-kantha-quilt-embroidered',
      titleBn: 'Pure Cotton Hand-Embroidered Traditional Nakshi Kantha (Double Bed)',
      titleEn: 'Pure Cotton Hand-Embroidered Traditional Nakshi Kantha (Double Bed)',
      desc: 'Artisan embroidered heritage quilt taking over two months to complete in rural Jashore villages.',
      basePrice: 320000n, // BDT 3,200
      moq: 5,
      isB2b: true,
      sku: 'SKU-KANTHA-039',
      stock: 35,
      attributes: { dimensions: '7 x 8 feet (King Size)', layers: '3 Layer Vintage Cotton Muslin' },
      tiers: [
        { minQty: 5, unitPrice: 260000n },
        { minQty: 20, unitPrice: 22000n },
      ],
      image: '/products/nakshi-kantha-quilt.webp',
    },
    {
      index: 40,
      catIndex: 7,
      sellerId: sellerBengalId,
      slug: 'brass-decorative-incense-burner',
      titleBn: 'Antique Carved Dhamrai Brass Incense Holder & Burner',
      titleEn: 'Antique Carved Dhamrai Brass Incense Holder & Burner',
      desc: 'Ornate pierced floral cutwork brass burner with wooden heat-resistant handle for burning bakhoor and natural dhoop.',
      basePrice: 85000n, // BDT 850
      moq: 1,
      isB2b: false,
      sku: 'SKU-INCENSE-040',
      stock: 50,
      attributes: { finish: 'Antique Golden Patina', height: '7 inches', weight: '450 grams' },
      image: '/products/brass-incense-burner.webp',
    },

    // Category 9: Natural Beauty & Herbal Care (indices 41 to 45)
    {
      index: 41,
      catIndex: 8,
      sellerId: sellerJamdaniId,
      slug: 'pure-organic-neem-wood-comb',
      titleBn: 'Handcrafted Anti-Dandruff Organic Neem Wood Comb',
      titleEn: 'Handcrafted Anti-Dandruff Organic Neem Wood Comb',
      desc: 'Smooth polished neem wood wide-tooth comb that controls scalp irritation and prevents static hair frizz.',
      basePrice: 18000n, // BDT 180
      moq: 30,
      isB2b: true,
      sku: 'SKU-COMB-041',
      stock: 300,
      attributes: { wood: '100% Seasoned Neem Wood', teeth: 'Dual Wide and Medium Tooth' },
      tiers: [
        { minQty: 30, unitPrice: 13000n },
        { minQty: 100, unitPrice: 9500n },
      ],
      image: '/products/neem-wood-comb.webp',
    },
    {
      index: 42,
      catIndex: 8,
      sellerId: sellerJamdaniId,
      slug: 'herbal-hair-oil-ayurvedic-200ml',
      titleBn: '21 Herb Infused Traditional Ayurvedic Hair Fall Control Oil (200ml)',
      titleEn: '21 Herb Infused Traditional Ayurvedic Hair Fall Control Oil (200ml)',
      desc: 'Formulated with amla, bhringraj, brahmi, and virgin coconut oil slow-cooked on traditional charcoal heat.',
      basePrice: 42000n, // BDT 420
      moq: 15,
      isB2b: true,
      sku: 'SKU-HAIROIL-042',
      stock: 160,
      attributes: { keyHerbs: 'Bhringraj, Amla, Methi, Shikakai', mineralOilFree: true, volume: '200ml' },
      tiers: [
        { minQty: 15, unitPrice: 33000n },
        { minQty: 60, unitPrice: 28000n },
      ],
      image: '/products/ayurvedic-hair-oil.webp',
    },
    {
      index: 43,
      catIndex: 8,
      sellerId: sellerJamdaniId,
      slug: 'multani-mitti-bentonite-clay-200g',
      titleBn: 'Pure Ayurvedic Fuller Earth / Multani Mitti Face Pack (200g)',
      titleEn: 'Pure Ayurvedic Fuller Earth / Multani Mitti Face Pack (200g)',
      desc: 'Fine micro-filtered natural healing clay for gentle pore cleansing, oil balancing, and skin brightening.',
      basePrice: 15000n, // BDT 150
      moq: 1,
      isB2b: false,
      sku: 'SKU-CLAYMK-043',
      stock: 90,
      attributes: { form: 'Micro-ground Powder', chemicalsAdded: 'None - 100% Pure Clay', weight: '200g' },
      image: '/products/multani-mitti-pack.webp',
    },
    {
      index: 44,
      catIndex: 8,
      sellerId: sellerJamdaniId,
      slug: 'handcrafted-organic-goat-milk-soap',
      titleBn: 'Cold-Processed Artisan Organic Goat Milk & Honey Soap (100g Bar)',
      titleEn: 'Cold-Processed Artisan Organic Goat Milk & Honey Soap (100g Bar)',
      desc: 'Sulfate and paraben free handmade soap bar made with raw goat milk, cold-pressed olive oil, and organic honey.',
      basePrice: 22000n, // BDT 220
      moq: 25,
      isB2b: true,
      sku: 'SKU-SOAP-044',
      stock: 220,
      attributes: { curingTime: '6 Weeks Cold Process', slsFree: true, skinType: 'Sensitive & Dry Skin' },
      tiers: [
        { minQty: 25, unitPrice: 16000n },
        { minQty: 100, unitPrice: 13000n },
      ],
      image: '/products/goat-milk-soap-bar.webp',
    },
    {
      index: 45,
      catIndex: 8,
      sellerId: sellerJamdaniId,
      slug: 'organic-aloe-vera-gel-250g',
      titleBn: '99% Pure Soothing Organic Aloe Vera Skin & Hair Gel (250g Tub)',
      titleEn: '99% Pure Soothing Organic Aloe Vera Skin & Hair Gel (250g Tub)',
      desc: 'Pure soothing multi-purpose gel harvested from fresh organic aloe leaves for sunburn, hydration, and hair care.',
      basePrice: 29000n, // BDT 290
      moq: 1,
      isB2b: false,
      sku: 'SKU-ALOE-045',
      stock: 110,
      attributes: { purity: '99% Pure Organic Gel', artificialColor: '0% Added Color or Fragrance', netWeight: '250g' },
      image: '/products/pure-aloe-gel.webp',
    },

    // Category 10: Industrial Hardware & Safety (indices 46 to 50)
    {
      index: 46,
      catIndex: 9,
      sellerId: sellerBengalId,
      slug: 'industrial-safety-helmet-isi',
      titleBn: 'Heavy Duty Polycarbonate Construction Safety Helmet (White)',
      titleEn: 'Heavy Duty Polycarbonate Construction Safety Helmet (White)',
      desc: 'High-impact industrial helmet with ratchet head suspension, ventilation slots, and sweatband.',
      basePrice: 45000n, // BDT 450
      moq: 20,
      isB2b: true,
      sku: 'SKU-HELMET-046',
      stock: 600,
      attributes: { material: 'High-Density Polyethylene', certification: 'CE / ANSI Z89.1 Certified', color: 'Safety White' },
      tiers: [
        { minQty: 20, unitPrice: 35000n },
        { minQty: 100, unitPrice: 28000n },
        { minQty: 500, unitPrice: 23000n },
      ],
      image: '/products/industrial-safety-helmet.webp',
    },
    {
      index: 47,
      catIndex: 9,
      sellerId: sellerBengalId,
      slug: 'reinforced-leather-welding-gloves',
      titleBn: 'Heat Resistant Split Leather Industrial Welding Gloves (Pair)',
      titleEn: 'Heat Resistant Split Leather Industrial Welding Gloves (Pair)',
      desc: '14-inch heavy duty cow split leather gloves lined with Kevlar stitching for arc welding and metallurgy works.',
      basePrice: 32000n, // BDT 320
      moq: 30,
      isB2b: true,
      sku: 'SKU-GLOVES-047',
      stock: 450,
      attributes: { length: '14 inches with Gauntlet Cuff', heatRating: 'Up to 350°C Contact Heat', material: 'Cow Split Leather' },
      tiers: [
        { minQty: 30, unitPrice: 25000n },
        { minQty: 150, unitPrice: 20000n },
      ],
      image: '/products/leather-welding-gloves.webp',
    },
    {
      index: 48,
      catIndex: 9,
      sellerId: sellerBengalId,
      slug: 'ansi-approved-safety-goggles',
      titleBn: 'Anti-Fog Clear Impact Resistant Safety Eye Goggles',
      titleEn: 'Anti-Fog Clear Impact Resistant Safety Eye Goggles',
      desc: 'Wrap-around panoramic safety eyewear with UV400 protection and scratch-resistant polycarbonate lens.',
      basePrice: 19000n, // BDT 190
      moq: 50,
      isB2b: true,
      sku: 'SKU-GOGGLES-048',
      stock: 700,
      attributes: { standard: 'ANSI Z87.1 / EN166', features: 'Anti-fog & Scratch Resistant Coating' },
      tiers: [
        { minQty: 50, unitPrice: 14000n },
        { minQty: 200, unitPrice: 11000n },
      ],
      image: '/products/safety-goggles-clear.webp',
    },
    {
      index: 49,
      catIndex: 9,
      sellerId: sellerBengalId,
      slug: 'safety-vest-high-visibility',
      titleBn: 'Neon Yellow Reflective High-Visibility Construction Vest',
      titleEn: 'Neon Yellow Reflective High-Visibility Construction Vest',
      desc: 'EN ISO 20471 compliant Class 2 high visibility breathable mesh vest with 2-inch wide 3M reflective tape.',
      basePrice: 18000n, // BDT 180
      moq: 50,
      isB2b: true,
      sku: 'SKU-VEST-049',
      stock: 850,
      attributes: { closure: 'Front Heavy Duty Zipper', tape: '2-inch High-Reflection Silver Strips' },
      tiers: [
        { minQty: 50, unitPrice: 13500n },
        { minQty: 200, unitPrice: 10500n },
      ],
      image: '/products/high-vis-safety-vest.webp',
    },
    {
      index: 50,
      catIndex: 9,
      sellerId: sellerBengalId,
      slug: 'steel-toe-safety-work-boots',
      titleBn: 'Industrial Oil & Acid Resistant Steel-Toe Work Safety Boots (Pair)',
      titleEn: 'Industrial Oil & Acid Resistant Steel-Toe Work Safety Boots (Pair)',
      desc: '200 Joule impact steel toe safety footwear with puncture-resistant steel midsole and oil-resistant PU sole.',
      basePrice: 265000n, // BDT 2,650
      moq: 10,
      isB2b: true,
      sku: 'SKU-BOOTS-050',
      stock: 140,
      attributes: { protection: '200J Impact Steel Cap + Midsole Plate', sole: 'Dual Density Anti-Skid Polyurethane' },
      tiers: [
        { minQty: 10, unitPrice: 215000n },
        { minQty: 50, unitPrice: 185000n },
      ],
      image: '/products/steel-toe-safety-boots.webp',
    },
  ];

  // Insert Products, Variants, Tiers, and Images
  for (const item of rawProducts) {
    const numStr = String(item.index).padStart(12, '0');
    const productId = `f0000000-0000-4000-8000-${numStr}`;
    const variantId = `f1000000-0000-4000-8000-${numStr}`;
    const imageId = `f2000000-0000-4000-8000-${numStr}`;
    const categoryId = catIds[item.catIndex]!;

    // Product master row
    await db.insert(products).values({
      id: productId,
      sellerId: item.sellerId,
      categoryId,
      slug: item.slug,
      titleBn: item.titleBn,
      titleEn: item.titleEn,
      description: item.desc,
      status: 'active',
      basePrice: item.basePrice,
      moq: item.moq,
      isB2bEnabled: item.isB2b,
    }).onConflictDoNothing();

    // Product Variant
    await db.insert(productVariants).values({
      id: variantId,
      productId,
      sku: item.sku,
      attributes: item.attributes,
      stock: item.stock,
      price: item.basePrice,
    }).onConflictDoNothing();

    // Product Image
    await db.insert(productImages).values({
      id: imageId,
      productId,
      storagePath: item.image,
      sort: 0,
    }).onConflictDoNothing();

    // B2B Wholesale Price Tiers (if applicable)
    if (item.tiers && item.tiers.length > 0) {
      let tierIdx = 1;
      for (const tier of item.tiers) {
        const tierNumStr = String(item.index * 100 + tierIdx).padStart(12, '0');
        const tierId = `f3000000-0000-4000-8000-${tierNumStr}`;
        tierIdx++;
        await db.insert(priceTiers).values({
          id: tierId,
          productId,
          minQty: tier.minQty,
          unitPrice: tier.unitPrice,
        }).onConflictDoNothing();
      }
    }
  }

  const countsAfter = await getTableCounts();
  console.log('[Seed] Counts after seeding:', countsAfter);

  return { before: countsBefore, after: countsAfter };
}

// Execute immediately when invoked from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(({ before, after }) => {
      console.log('\n================ SEED SUMMARY ================');
      console.log('Table                   Before   After    Added');
      console.log('-----------------------------------------------');
      for (const key of Object.keys(before) as Array<keyof TableCounts>) {
        const b = before[key];
        const a = after[key];
        const diff = a - b;
        console.log(`${key.padEnd(24)} ${String(b).padStart(6)}   ${String(a).padStart(6)}   +${diff}`);
      }
      console.log('===============================================\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] FATAL Error during seed execution:', err);
      process.exit(1);
    });
}
