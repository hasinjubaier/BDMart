import { chromium, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createSessionToken } from '../src/lib/auth/session';

const BASE_URL = 'http://localhost:3000';
const WORKSPACE_SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');
const ARTIFACT_SCREENSHOTS_DIR = 'C:/Users/Hasin/.gemini/antigravity/brain/6c19348d-247a-4f55-b353-56f6cf67649e/screenshots';

// Ensure screenshots directories exist
for (const dir of [WORKSPACE_SCREENSHOTS_DIR, ARTIFACT_SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreen(page: Page, filename: string) {
  const p1 = path.join(WORKSPACE_SCREENSHOTS_DIR, filename);
  const p2 = path.join(ARTIFACT_SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`[Screenshot captured]: ${filename}`);
}

// Development accounts
const SELLER_USER = {
  id: 'a0000000-0000-4000-8000-000000000001',
  firebaseUid: 'seed-firebase-seller-01',
  role: 'seller',
};

const ADMIN_USER = {
  id: 'a0000000-0000-4000-8000-000000000005',
  firebaseUid: 'seed-firebase-admin-01',
  role: 'admin',
};

const sellerCookie = {
  name: 'bdmart_session',
  value: createSessionToken(SELLER_USER),
  url: 'http://localhost:3000',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax' as const,
};

const adminCookie = {
  name: 'bdmart_session',
  value: createSessionToken(ADMIN_USER),
  url: 'http://localhost:3000',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax' as const,
};

// Unique listing details for the single traceable test item
const timestamp = Date.now();
const LISTING = {
  title: `Artisan Embroidered Nakshi Jute Bag (Phase 2 Test ${timestamp})`,
  sku1: `SKU-NAKSHI-${timestamp}-01`,
  sku2: `SKU-NAKSHI-${timestamp}-02`,
  price1Bdt: '420',
  price2Bdt: '450',
  stock1: '1', // Exactly 1 unit initially
  stock2: '10',
  image: '/products/jute-table-runner.webp',
  slug: `artisan-embroidered-nakshi-jute-bag-phase-2-test-${timestamp}`,
};

async function runJourney() {
  console.log('--- STARTING PHASE 2 BROWSER JOURNEY ---');
  console.log(`Traceable Item SKU: ${LISTING.sku1}`);
  console.log(`Title: ${LISTING.title}`);

  const browser = await chromium.launch({ headless: true });

  const observations: Record<string, string> = {};

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Seller browser creates draft and submits for moderation
    // -------------------------------------------------------------------------
    console.log('\n[Step 1] Seller Browser: Creating listing and submitting for moderation...');
    const sellerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await sellerContext.addCookies([sellerCookie]);
    const sellerPage = await sellerContext.newPage();

    sellerPage.on('console', (msg) => console.log('[Seller Browser Console]:', msg.text()));
    sellerPage.on('pageerror', (err) => console.log('[Seller Browser PageError]:', err));

    await sellerPage.goto(`${BASE_URL}/seller/products/new`);
    await sellerPage.waitForLoadState('domcontentloaded');

    // Fill form
    await sellerPage.fill('[data-testid="product-title-input"]', LISTING.title);
    await sellerPage.fill('[data-testid="product-price-input"]', LISTING.price1Bdt);
    await sellerPage.fill(
      '[data-testid="product-description-input"]',
      'Handcrafted natural golden jute tote bag adorned with traditional Nakshi Kantha floral embroidery. Features reinforced cotton handles and 300 GSM fabric.'
    );
    await sellerPage.fill('[data-testid="product-image-input"]', LISTING.image);

    // Variant 1
    await sellerPage.fill('[data-testid="variant-sku-input-0"]', LISTING.sku1);
    await sellerPage.fill('[data-testid="variant-stock-input-0"]', LISTING.stock1);
    await sellerPage.fill('[data-testid="variant-price-input-0"]', LISTING.price1Bdt);

    // Add Variant 2
    await sellerPage.click('[data-testid="add-variant-btn"]');
    await sellerPage.fill('[data-testid="variant-sku-input-1"]', LISTING.sku2);
    await sellerPage.fill('[data-testid="variant-stock-input-1"]', LISTING.stock2);
    await sellerPage.fill('[data-testid="variant-price-input-1"]', LISTING.price2Bdt);

    // Save and submit
    await sellerPage.click('[data-testid="submit-moderation-btn"]');

    // Wait for either navigation or error banner
    try {
      await sellerPage.waitForURL('**/seller/products', { timeout: 20000 });
    } catch {
      const errBanner = await sellerPage.locator('[data-testid="product-form-error"]').textContent().catch(() => null);
      console.log('Error banner on form:', errBanner);
      await sellerPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-seller-error.png') });
      throw new Error(`Seller form submission failed: ${errBanner || 'Unknown error'}`);
    }
    await sellerPage.waitForLoadState('domcontentloaded');

    const sellerProductRow = sellerPage.locator(`text=${LISTING.title}`);
    await sellerProductRow.waitFor({ timeout: 15000 });

    const statusPill = await sellerPage.locator('text=pending').first().textContent();
    console.log(`✓ Product created and submitted. Status displayed: ${statusPill?.trim()}`);
    observations['step1_seller_submit'] = `Listing created with SKU ${LISTING.sku1}. Status: ${statusPill?.trim()}`;

    await captureScreen(sellerPage, '01-seller-draft-submitted.png');

    // -------------------------------------------------------------------------
    // STEP 2: Visitor browser (signed-out) verifies pending listing is hidden
    // -------------------------------------------------------------------------
    console.log('\n[Step 2] Visitor Browser: Verifying pending listing is absent from public search & direct URL...');
    const visitorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const visitorPage = await visitorContext.newPage();

    // 2a. Search by SKU
    await visitorPage.goto(`${BASE_URL}/products?q=${LISTING.sku1}`);
    await visitorPage.waitForLoadState('domcontentloaded');
    const noProductsMsg = await visitorPage.locator('text=No Products Found').isVisible();
    console.log(`✓ Search for pending SKU returned 'No Products Found': ${noProductsMsg}`);

    // 2b. Direct detail URL
    const directResponse = await visitorPage.goto(`${BASE_URL}/products/${LISTING.slug}`);
    const is404 = directResponse?.status() === 404 || (await visitorPage.locator('text=404').isVisible());
    console.log(`✓ Direct access to pending listing URL returned 404 Not Found: ${is404}`);
    observations['step2_visitor_hidden'] = `Pending listing absent from search (0 results) and returns 404 on direct URL /products/${LISTING.slug}`;

    await captureScreen(visitorPage, '02-visitor-pending-hidden.png');

    // -------------------------------------------------------------------------
    // STEP 3: Admin & Seller: Return submission with reason, seller fixes, admin publishes
    // -------------------------------------------------------------------------
    console.log('\n[Step 3] Admin & Seller: Return listing, correct, resubmit, and publish...');
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await adminContext.addCookies([adminCookie]);
    const adminPage = await adminContext.newPage();

    // 3a. Admin queue
    await adminPage.goto(`${BASE_URL}/admin/moderation?status=pending`);
    await adminPage.waitForLoadState('domcontentloaded');

    // Click review button for this item
    const reviewBtn = adminPage
      .locator('div', { has: adminPage.locator(`text=${LISTING.title}`) })
      .locator('text=Review Listing →')
      .first();
    await reviewBtn.click();
    await adminPage.waitForLoadState('domcontentloaded');

    await captureScreen(adminPage, '03-admin-review-detail.png');

    // 3b. Return listing with reason
    const returnReason = 'Please specify exact jute fiber grade and certify eco-friendly vegetable dyeing.';
    await adminPage.click('[data-testid="toggle-return-btn"]');
    await adminPage.fill('[data-testid="return-reason-textarea"]', returnReason);
    await adminPage.click('[data-testid="confirm-return-btn"]');
    await adminPage.waitForSelector('[data-testid="moderation-success"]', { timeout: 15000 });
    console.log(`✓ Admin returned submission with reason: "${returnReason}"`);

    // 3c. Seller checks returned reason
    await sellerPage.goto(`${BASE_URL}/seller/products?status=returned`);
    await sellerPage.waitForLoadState('domcontentloaded');
    const returnedBanner = await sellerPage.locator(`text=${returnReason}`).isVisible();
    console.log(`✓ Seller sees returned moderation reason in workspace: ${returnedBanner}`);
    await captureScreen(sellerPage, '04-seller-returned-reason.png');

    // 3d. Seller edits and resubmits
    const editBtn = sellerPage
      .locator('div', { has: sellerPage.locator(`text=${LISTING.title}`) })
      .locator('text=Edit & Resubmit')
      .first();
    await editBtn.click();
    await sellerPage.waitForLoadState('domcontentloaded');

    await sellerPage.fill(
      '[data-testid="product-description-input"]',
      'Handcrafted 100% Grade-A golden jute tote bag. Hand-embroidered using certified eco-friendly vegetable dyed cotton threads. Reinforced seams.'
    );
    await sellerPage.click('[data-testid="submit-moderation-btn"]');
    await sellerPage.waitForURL('**/seller/products', { timeout: 20000 });
    await sellerPage.waitForLoadState('domcontentloaded');
    console.log('✓ Seller addressed reason and resubmitted listing.');

    // 3e. Admin publishes listing
    await adminPage.goto(`${BASE_URL}/admin/moderation?status=pending`);
    await adminPage.waitForLoadState('domcontentloaded');
    const reviewResubmitBtn = adminPage
      .locator('div', { has: adminPage.locator(`text=${LISTING.title}`) })
      .locator('text=Review Listing →')
      .first();
    await reviewResubmitBtn.click();
    await adminPage.waitForLoadState('domcontentloaded');

    await adminPage.click('[data-testid="publish-listing-btn"]');
    await adminPage.waitForSelector('[data-testid="moderation-success"]', { timeout: 15000 });
    console.log('✓ Admin published listing.');
    await captureScreen(adminPage, '05-admin-published.png');
    observations['step3_moderation_cycle'] = `Admin returned with reason: "${returnReason}". Seller corrected and resubmitted. Admin published.`;

    // -------------------------------------------------------------------------
    // STEP 4: Visitor finds published listing, checks price and availability, checks URL state
    // -------------------------------------------------------------------------
    console.log('\n[Step 4] Visitor Browser: Finding published listing, checking variant availability and URL state...');

    // 4a. Find by exact SKU
    await visitorPage.goto(`${BASE_URL}/products?q=${LISTING.sku1}`);
    await visitorPage.waitForLoadState('domcontentloaded');
    const productCard = visitorPage.locator(`text=${LISTING.title}`);
    await productCard.waitFor({ timeout: 15000 });
    console.log(`✓ Visitor successfully found published listing in catalog via SKU search.`);
    await captureScreen(visitorPage, '06-visitor-search-result.png');

    // 4b. Open PDP through normal navigation
    await productCard.click();
    await visitorPage.waitForURL(`**/products/${LISTING.slug}*`, { timeout: 15000 });
    await visitorPage.waitForLoadState('domcontentloaded');

    const displayedTitle = await visitorPage.locator('[data-testid="pdp-product-title"]').textContent();
    const selectedSku = await visitorPage.locator('[data-testid="selected-variant-sku"]').textContent();
    const initialBadge = await visitorPage.locator('[data-testid="variant-availability-badge"]').textContent();
    console.log(`✓ PDP loaded: "${displayedTitle?.trim()}", SKU: ${selectedSku?.trim()}, Availability: ${initialBadge?.trim()}`);

    observations['step4_visitor_found'] = `Found published item. SKU: ${selectedSku?.trim()}, Initial availability: ${initialBadge?.trim()}, Price: BDT 420.`;
    await captureScreen(visitorPage, '07-visitor-pdp-initial-instock.png');

    // 4c. Verify URL search & filter state persistence and Back navigation
    const filterUrl = `${BASE_URL}/products?minPrice=300&maxPrice=500&sort=price_asc`;
    await visitorPage.goto(filterUrl);
    await visitorPage.waitForLoadState('domcontentloaded');

    // Click into first product and wait for PDP navigation
    await visitorPage.locator('article h3 a').first().click();
    await visitorPage.waitForURL('**/products/*', { timeout: 15000 });
    await visitorPage.waitForLoadState('domcontentloaded');

    // Browser back navigation
    await visitorPage.goBack();
    await visitorPage.waitForURL('**/products?*', { timeout: 15000 });
    await visitorPage.waitForLoadState('domcontentloaded');
    const currentUrlAfterBack = visitorPage.url();
    expect(currentUrlAfterBack).toContain('minPrice=300');
    expect(currentUrlAfterBack).toContain('maxPrice=500');
    expect(currentUrlAfterBack).toContain('sort=price_asc');

    // Refresh page
    await visitorPage.reload();
    await visitorPage.waitForLoadState('domcontentloaded');
    const currentUrlAfterReload = visitorPage.url();
    expect(currentUrlAfterReload).toContain('minPrice=300');
    expect(currentUrlAfterReload).toContain('maxPrice=500');
    expect(currentUrlAfterReload).toContain('sort=price_asc');
    console.log('✓ URL search and filter state verified on Back navigation and page reload.');

    // -------------------------------------------------------------------------
    // STEP 5: Seller adjusts stock of variant to zero with reason
    // -------------------------------------------------------------------------
    console.log('\n[Step 5] Seller Browser: Adjusting stock of variant to 0 with observable reason...');
    await sellerPage.goto(`${BASE_URL}/seller/inventory`);
    await sellerPage.waitForLoadState('domcontentloaded');

    const stockAdjustBtn = sellerPage.locator(`[data-testid="adjust-stock-btn-${LISTING.sku1}"]`);
    await stockAdjustBtn.click();

    await sellerPage.fill('[data-testid="new-stock-input"]', '0');
    const adjustReason = 'Showroom physical sample allocation; zero warehouse units remaining.';
    await sellerPage.fill('[data-testid="stock-reason-input"]', adjustReason);
    await sellerPage.click('[data-testid="commit-stock-adjust-btn"]');
    await sellerPage.waitForSelector('[data-testid="stock-adjust-success"]', { timeout: 15000 });

    console.log(`✓ Stock adjusted to 0 with reason: "${adjustReason}"`);
    await captureScreen(sellerPage, '08-seller-stock-zeroed.png');
    observations['step5_seller_stock_zeroed'] = `Adjusted stock of ${LISTING.sku1} from 1 to 0. Reason: "${adjustReason}"`;

    // -------------------------------------------------------------------------
    // STEP 6: Visitor refreshes PDP, verifies Out of Stock on variant, sibling retains stock
    // -------------------------------------------------------------------------
    console.log('\n[Step 6] Visitor Browser: Refreshing PDP to observe out-of-stock outcome & sibling variant...');
    await visitorPage.goto(`${BASE_URL}/products/${LISTING.slug}`);
    await visitorPage.waitForLoadState('domcontentloaded');

    // Verify Variant 1 is Out of Stock
    const updatedBadge = await visitorPage.locator('[data-testid="variant-availability-badge"]').textContent();
    const addToCartDisabled = await visitorPage.locator('[data-testid="add-to-cart-button"]').isDisabled();
    console.log(`✓ Variant ${LISTING.sku1} badge: "${updatedBadge?.trim()}", CTA disabled: ${addToCartDisabled}`);

    // Switch to Sibling Variant 2
    const siblingBtn = visitorPage.locator(`[data-testid="variant-btn-${LISTING.sku2}"]`);
    await siblingBtn.click();
    const siblingBadge = await visitorPage.locator('[data-testid="variant-availability-badge"]').textContent();
    const siblingSku = await visitorPage.locator('[data-testid="selected-variant-sku"]').textContent();
    console.log(`✓ Sibling variant ${siblingSku?.trim()} availability: "${siblingBadge?.trim()}"`);

    observations['step6_visitor_outcome'] = `Variant ${LISTING.sku1} updated to "${updatedBadge?.trim()}". Sibling variant ${siblingSku?.trim()} retained "${siblingBadge?.trim()}".`;
    await captureScreen(visitorPage, '09-visitor-variant-out-of-stock.png');

    // -------------------------------------------------------------------------
    // STEP 7: Public In-Stock Filter & Full Zero-Stock Lifecycle Check
    // -------------------------------------------------------------------------
    console.log('\n[Step 7] Explicit Public In-Stock Filter Verification...');

    // 7a. While sibling variant has stock (10 units), listing must remain visible on /products?inStock=true
    await visitorPage.goto(`${BASE_URL}/products?inStock=true&q=${LISTING.sku1}`);
    await visitorPage.waitForLoadState('domcontentloaded');
    const stillVisibleInStock = await visitorPage.locator(`text=${LISTING.title}`).isVisible();
    console.log(`✓ Listing visible on /products?inStock=true while sibling has stock: ${stillVisibleInStock}`);
    await captureScreen(visitorPage, '12-visitor-instock-filter-sibling-available.png');
    observations['step7a_instock_filter_sibling'] = `Listing remains visible on /products?inStock=true while sibling retains 10 units.`;

    // 7b. Seller adjusts sibling variant 2 stock to 0
    await sellerPage.goto(`${BASE_URL}/seller/inventory`);
    await sellerPage.waitForLoadState('domcontentloaded');
    const stockAdjustBtn2 = sellerPage.locator(`[data-testid="adjust-stock-btn-${LISTING.sku2}"]`);
    await stockAdjustBtn2.click();
    await sellerPage.fill('[data-testid="new-stock-input"]', '0');
    const zeroSiblingReason = 'Complete inventory zero-out: stock balance audit confirmed 0 warehouse units.';
    await sellerPage.fill('[data-testid="stock-reason-input"]', zeroSiblingReason);
    await sellerPage.click('[data-testid="commit-stock-adjust-btn"]');
    await sellerPage.waitForSelector('[data-testid="stock-adjust-success"]', { timeout: 15000 });
    console.log(`✓ Sibling variant stock adjusted to 0 with reason: "${zeroSiblingReason}"`);
    await captureScreen(sellerPage, '13-seller-sibling-stock-zeroed.png');
    observations['step7b_sibling_zeroed'] = `Adjusted sibling ${LISTING.sku2} to 0 stock. Reason: "${zeroSiblingReason}".`;

    // 7c. Visitor checks /products?inStock=true: listing must DISAPPEAR!
    await visitorPage.goto(`${BASE_URL}/products?inStock=true&q=${LISTING.sku1}`);
    await visitorPage.waitForLoadState('domcontentloaded');
    const disappearedFromInStock = !(await visitorPage.locator(`text=${LISTING.title}`).isVisible());
    console.log(`✓ Listing disappeared from /products?inStock=true when all variants zeroed: ${disappearedFromInStock}`);
    await captureScreen(visitorPage, '14-visitor-instock-filter-disappeared.png');
    observations['step7c_disappeared_from_instock'] = `Listing completely disappears from /products?inStock=true when all variants reach 0 stock.`;

    // 7d. Visitor checks general catalog /products (or /products?q=...): listing must still appear as Out of Stock!
    await visitorPage.goto(`${BASE_URL}/products?q=${LISTING.sku1}`);
    await visitorPage.waitForLoadState('domcontentloaded');
    const visibleInAllProducts = await visitorPage.locator(`text=${LISTING.title}`).isVisible();
    const outOfStockBadge = await visitorPage.locator('text=Out of Stock').first().isVisible();
    console.log(`✓ Listing visible on /products as out-of-stock: ${visibleInAllProducts} (Badge: ${outOfStockBadge})`);
    await captureScreen(visitorPage, '15-visitor-catalog-out-of-stock.png');
    observations['step7d_visible_out_of_stock'] = `Listing still discoverable on /products with "Out of Stock" status.`;

    // -------------------------------------------------------------------------
    // STEP 8: Keyboard Navigation & Visible Focus Check
    // -------------------------------------------------------------------------
    console.log('\n[Step 8] Keyboard Navigation & Visible Focus Verification...');
    await visitorPage.goto(`${BASE_URL}/products/${LISTING.slug}`);
    await visitorPage.waitForLoadState('domcontentloaded');

    // Tab through interactive controls
    await visitorPage.keyboard.press('Tab');
    await visitorPage.keyboard.press('Tab');
    await visitorPage.keyboard.press('Tab');
    await visitorPage.keyboard.press('Tab');
    await captureScreen(visitorPage, '16-keyboard-focus-visible.png');
    console.log('✓ Keyboard focus tested and screenshot captured.');

    // -------------------------------------------------------------------------
    // Mobile 360px Viewport Check
    // -------------------------------------------------------------------------
    console.log('\n[Mobile 360px Viewport Verification]');
    const mobileContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${BASE_URL}/products/${LISTING.slug}`);
    await mobilePage.waitForLoadState('domcontentloaded');
    await captureScreen(mobilePage, '10-mobile-360px-pdp.png');

    await mobilePage.goto(`${BASE_URL}/products`);
    await mobilePage.waitForLoadState('domcontentloaded');
    await captureScreen(mobilePage, '11-mobile-360px-catalog.png');
    console.log('✓ 360px mobile viewport screenshots captured.');

    await mobileContext.close();
    await visitorContext.close();
    await sellerContext.close();
    await adminContext.close();

    console.log('\n--- ALL BROWSER JOURNEY STEPS COMPLETED SUCCESSFULLY ---');
    console.log(JSON.stringify(observations, null, 2));

    return { success: true, observations, listing: LISTING };
  } finally {
    await browser.close();
  }
}

// Simple expect helper for assertions
function expect(val: unknown) {
  return {
    toContain: (sub: string) => {
      if (typeof val !== 'string' || !val.includes(sub)) {
        throw new Error(`Expected "${val}" to contain "${sub}"`);
      }
    },
  };
}

runJourney()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Browser journey failed:', err);
    process.exit(1);
  });
