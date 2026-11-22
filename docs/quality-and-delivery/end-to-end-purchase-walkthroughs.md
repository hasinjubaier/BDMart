# End-to-End Purchase Walkthroughs

This document traces two complete purchasing journeys using the **exact same illustrative SKU**, detailing every actor, rule, state transition, affected data table, failure recovery flow, and concurrency race condition.

---

## Illustrative Test SKU Profile: `SKU-JUTE-BAG-001`
- **Product Title:** Premium Eco Handcrafted Jute Tote Bag (পরিবেশবান্ধব পাটের টোট ব্যাগ)
- **Seller:** Bengal Crafts Ltd (`seller_id = s-bengal-01`, KYC Status: `approved`)
- **Category:** Fashion & Lifestyle $\rightarrow$ Eco Bags (`category_id = cat-bags-01`)
- **Variant:** Natural Golden Jute / Large (`variant_id = var-jute-01`, `sku = SKU-JUTE-BAG-001`)
- **Initial Inventory Stock:** **105 units**
- **Retail Base Price (1–49 pcs):** `৳350` (35,000 poisha)
- **Minimum Order Quantity (MOQ):** **50 units**
- **B2B Wholesale Price Tiers (`price_tiers`):**
  - Tier 1 (50–99 pcs): `৳280 / pc` (28,000 poisha)
  - Tier 2 (100–499 pcs): `৳220 / pc` (22,000 poisha)
  - Tier 3 (500+ pcs): `৳180 / pc` (18,000 poisha)
- **B2B Wholesale Enabled:** `is_b2b_enabled = true`

---

## Walkthrough 1: Retail Consumer Purchase (B2C)

### 1.1. The Actor & Intent
- **Actor:** Tanvir Hossain (Retail Consumer in Sylhet, `role = 'buyer'`, `user_id = u-tanvir-01`)
- **Goal:** Buy **1 unit** of `SKU-JUTE-BAG-001` for personal use.

### 1.2. Step-by-Step Flow

| Step | User Action | System Processing & Applicable Rules | Affected Data & Tables | Observable UI State & Verification |
|---|---|---|---|---|
| **1. Discovery** | Tanvir searches "Jute Bag" on mobile web (`/bn/`). | System executes full-text search. Filters active products. Displays standard retail price. B2B wholesale ladder is completely hidden. | Reads `products`, `product_variants`. | Card renders title in Bengali, rating (4.8★), retail price `৳৩৫০`, and "Add to Cart" button. |
| **2. Upfront Delivery** | Selects destination address: *Sylhet, Sylhet Sadar*. | Upfront delivery engine checks geographic zone: Outside Dhaka inter-district standard rate applies (`৳130` / 13,000 poisha). | Reads `addresses`. | PDP updates delivery widget: **"ডেলিভারি চার্জ: ৳১৩০"**. Total upfront price displayed: **৳৪৮০**. |
| **3. Cart & Review** | Adds 1 unit to cart and navigates to `/bn/cart`. | Calculates Subtotal: `৳350` (35,000 poisha) + Delivery: `৳130` (13,000 poisha) = Total: `৳480` (48,000 poisha). | Inserts/Updates `cart_items`. | Cart screen shows item summary, upfront delivery charge, and grand total `৳৪৮০`. No hidden fees. |
| **4. Checkout Submission** | Selects "Digital Payment (Card/MFS - SSLCommerz)" and clicks "Place Order". | Server Action `submitOrderAction` validates: 1) stock >= 1; 2) recalculates total on server (`35000 + 13000 = 48000 poisha`). Creates order in `PENDING` status. | Inserts `orders` (`status: PENDING`), inserts `order_items`. | Browser redirects to SSLCommerz sandbox payment gateway gateway page. |
| **5. Payment Execution** | Enters sandbox bKash wallet number, OTP `123456`, and PIN `1234`. | SSLCommerz processes authorization and fires server-to-server IPN webhook to `/api/webhooks/payment`. | Gateway transmits transaction payload. | Gateway shows "Payment Processing". |
| **6. IPN Processing & Escrow** | System receives server-to-server IPN. | 1) Server calls gateway validation API; 2) Reconciles amount (`48000 poisha`); 3) Checks idempotency key; 4) Commits DB transaction. | Updates `orders` (`status: CONFIRMED`). Inserts `escrow_ledger` (`state: held`, `amount: 35000`). Decrements stock (`105 -> 104`). | Order confirmed in database. Escrow held. |
| **7. Order Confirmation** | Browser redirects back to `/bn/checkout/success?orderId=...`. | Server validates order ownership. Renders order receipt with tracking link. | Reads `orders`. | Displays: **"আপনার অর্ডার নিশ্চিত হয়েছে! অর্ডার নং: #BD-1092"**. Escrow protection guarantee displayed. |

### 1.3. Failure & Recovery Flow (Interrupted Network at Payment)
- **Failure:** Tanvir's mobile browser drops internet connection right after entering bKash OTP, before the browser redirects back to BD Mart.
- **System Recovery:**
  1. SSLCommerz server-to-server IPN arrives independently at BD Mart backend `/api/webhooks/payment`.
  2. The server processes the payment, transitions `orders.status` to `CONFIRMED`, creates the `escrow_ledger` entry in `held` state, and decrements stock.
  3. When Tanvir reconnects 10 minutes later and visits `/bn/orders`, the system displays Order `#BD-1092` as **"পেমেন্ট সম্পন্ন — অর্ডার নিশ্চিত"** (Payment Completed — Order Confirmed). Zero customer panic; zero lost funds.

---

## Walkthrough 2: Verified Business Purchase (B2B)

### 2.1. The Actor & Intent
- **Actor:** Rafiqul Islam, Procurement Manager at "Dhaka Retailers Group" (`role = 'business_buyer'`, `businesses.verified_at != null`, `user_id = u-rafiq-02`)
- **Goal:** Buy **100 units** of `SKU-JUTE-BAG-001` for commercial resale.

### 2.2. Step-by-Step Flow

| Step | User Action | System Processing & Applicable Rules | Affected Data & Tables | Observable UI State & Verification |
|---|---|---|---|---|
| **1. B2B Discovery** | Rafiqul logs in and visits wholesale catalog at `/bn/wholesale`. | System detects `business_buyer` role. Displays wholesale badges, MOQ capsules, and volume tier previews. | Reads `products`, `price_tiers`, `businesses`. | Product card displays: **"পাইকারি দাম: ৳১৮০ - ৳২৮০ / পিস"**, **"MOQ: ৫০ পিস"**, and Verified Seller badge. |
| **2. Wholesale PDP** | Opens `/bn/wholesale/p/eco-jute-tote-bag`. | Server Component renders Volume Pricing Ladder: 50–99 pcs @ ৳280, 100–499 pcs @ ৳220, 500+ pcs @ ৳180. | Reads `price_tiers`. | Pricing ladder table renders with active tier highlighting. Minimum order quantity indicator visible. |
| **3. Quantity Selection** | Inputs quantity: `100`. | Dynamic price calculator detects Tier 2 (100–499 pcs). Unit price updates to `৳220`. Subtotal: $100 \times 220 = \text{৳}22,000$ (2,200,000 poisha). 15% VAT: `৳3,300`. Freight: `৳650`. Total: `৳25,950`. | Client calculation (validated server-side). | Sticky wholesale action bar displays unit price `৳২২০`, Total: `৳২৫,৯৫০`. |
| **4. MOQ Enforcement Check** | *Negative Test Case:* If Rafiqul attempts to order `40` units: | Server Action validates `quantity (40) < product.moq (50)`. Throws `ValidationError`. | None (Rejected). | UI displays error: **"নূন্যতম অর্ডারের পরিমাণ ৫০ পিস হতে হবে"** (Minimum order quantity must be 50 pcs). Order blocked. |
| **5. Wholesale Checkout** | Submits order for `100` units. | Server Action validates B2B role, verified business record, stock availability ($104 \ge 100$), and recalculates exact tier price on server. Atomically reserves 100 units. | Updates `product_variants.stock` ($104 \rightarrow 4$). Inserts `orders` (`type: b2b`, `status: PENDING`). | Redirects to business checkout review. Auto-generates Proforma Tax Invoice. |
| **6. Payment & Escrow** | Rafiqul completes digital escrow deposit of `৳25,950`. | Gateway IPN validates transaction. System creates `escrow_ledger` entry in `held` state for `৳22,000` (seller revenue net of commission). Order shifts to `CONFIRMED`. | Updates `orders` (`status: CONFIRMED`), inserts `escrow_ledger`. | Order confirmed screen displays official VAT Mushak 6.3 PDF download button. |
| **7. Dispatch & Delivery** | Seller packs 100 bags and dispatches via Steadfast Courier cargo. | Courier marks `DELIVERED` via webhook. System starts 7-day dispute window. After window, escrow ledger updates from `held` to `released`. | Updates `shipments`, updates `orders` (`status: DELIVERED` $\rightarrow$ `COMPLETED`), updates `escrow_ledger`. | Seller dashboard credits `৳20,900` (net of 5% commission). Buyer receives final VAT tax invoice. |

---

## 3. Concurrency & Isolation Analysis

### 3.1. Race Condition: Competing for the Last Units
- **Initial State:** Variant stock = **5 units**.
- **Event:** At $T_0$, Retail Buyer Tanvir attempts to checkout 1 unit. Simultaneously, at $T_0$, Business Buyer Rafiqul attempts to place a re-order of 5 units.
- **Concurrency Execution:**
  1. Both Server Actions initiate `db.transaction()` and issue `SELECT * FROM product_variants WHERE id = 'var-jute-01' FOR UPDATE`.
  2. The PostgreSQL engine grants row lock to the first transaction (e.g., Tanvir's retail order) and queues the second.
  3. Transaction 1 reads stock = 5, decrements stock to 4, commits transaction, and releases lock.
  4. Transaction 2 wakes up and acquires lock. It reads stock = 4. Since Rafiqul requested 5 units, `4 < 5` triggers `InsufficientStockError`.
  5. Transaction 2 cleanly aborts and rolls back.
- **Outcome:** Tanvir's purchase succeeds. Rafiqul is shown an immediate, clean out-of-stock notification: "Available stock (4) is less than requested quantity (5)." **Zero inventory overselling occurs.**

### 3.2. Business Account & Data Isolation
- "Dhaka Retailers Group" (`business_id = b-dhaka-01`) cannot see quotes, orders, or negotiated RFQ prices submitted to "Chittagong Traders" (`business_id = b-ctg-02`).
- All B2B queries strictly filter by `where(eq(orders.buyerId, session.userId))` or `where(eq(rfqs.businessId, session.businessId))`. Multi-tenant isolation verified by automated negative test suite.
