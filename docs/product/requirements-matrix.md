# Functional Requirements Matrix

All requirements carry a stable, immutable identifier used across UX, data schemas, API contracts, and automated test specifications.

---

## 1. Requirements Overview & Traceability Key
- **`REQ-PRD-*`**: General Product & Platform Rules
- **`REQ-B2C-*`**: Retail Buyer & Storefront Operations
- **`REQ-B2B-*`**: Wholesale, Corporate Buyers & RFQ Engine
- **`REQ-SEL-*`**: Seller Management & Fulfillment
- **`REQ-ESC-*`**: Escrow, Payments & Financial Accounting
- **`REQ-LOG-*`**: Courier Logistics & Tracking
- **`REQ-ADM-*`**: Administration, Audit & Compliance

---

## 2. Requirements Matrix

| ID | Title | Actor | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|---|
| **REQ-PRD-001** | Dual-Language Storefront | All | P0 | Next.js dynamic routing with `[locale]` (`bn` default, `en`). Zero hardcoded UI strings. | Language toggle switches all labels without page reload. URLs reflect `/bn/...` and `/en/...`. |
| **REQ-PRD-002** | Integer Poisha Financials | System | P0 | All prices, discounts, delivery fees, and taxes stored strictly in integer poisha (1 BDT = 100 poisha). | No floating-point values in database schema or mathematical operations. `formatBDT()` renders correctly. |
| **REQ-PRD-003** | Upfront Delivery Fee | Guest / Buyer | P0 | Delivery fee calculated upfront based on selected destination division/district/upazila prior to checkout. | Total order amount displayed on cart and PDP includes final delivery fee. No hidden fees added at payment step. |
| **REQ-B2C-001** | B2C Catalog Discovery | Guest / Buyer | P0 | Search, filter by category/price/rating, sort, and paginated product feeds. | Page load LCP < 2.5s on mobile. Full-text search supports Bengali and English script. |
| **REQ-B2C-002** | Guest Cart to Auth Transition | Guest / Buyer | P1 | Guests can build a cart; on initiating checkout, phone OTP login binds items to the user record. | Cart items seamlessly merge upon authentication without item loss or price recalculation errors. |
| **REQ-B2C-003** | Dual Payment Option | Buyer | P0 | Support both Cash on Delivery (COD) and Online Payment (SSLCommerz/aamarPay). | Buyer can choose COD or Digital payment. Digital payment initiates SSLCommerz sandbox session. |
| **REQ-B2C-004** | Delivered-Only Reviews | Buyer | P1 | Product reviews and ratings can only be submitted for items where `order.status == 'DELIVERED'`. | Server Action rejects review submission if no delivered `order_item_id` belongs to the requesting buyer. |
| **REQ-B2B-001** | Business Buyer Verification | Buyer / Admin | P0 | Buyer submits Company Name, TIN, and BIN. Admin verifies credentials before enabling B2B role. | `businesses.verified_at` must be non-null for user to receive `business_buyer` permissions. |
| **REQ-B2B-002** | Tiered Wholesale Pricing | Business Buyer | P0 | Displays volume price tiers (`price_tiers`) exclusively to verified business buyers. | Regular `buyer` or guest cannot see wholesale pricing in UI or via API responses. |
| **REQ-B2B-003** | Server-Side MOQ Enforcement | Business Buyer | P0 | B2B orders must meet or exceed the seller-defined Minimum Order Quantity (MOQ). | Server Action rejects any order where `qty < product.moq` with HTTP 400 Bad Request. |
| **REQ-B2B-004** | RFQ Submission & Quoting | Business Buyer / Seller | P0 | Business buyer posts custom RFQ; qualified sellers submit binding quotes with unit price and lead time. | Buyer can view competing quotes side-by-side and accept one quote, automatically creating an order. |
| **REQ-B2B-005** | VAT-Compliant Tax Invoices | Business Buyer | P1 | System auto-generates downloadable PDF commercial tax invoices with seller BIN, buyer BIN, and 15% VAT breakdown. | Generated PDF invoice contains valid Mushak 6.3 compliant data fields and formatted BDT totals. |
| **REQ-SEL-001** | Seller KYC Verification | Seller / Admin | P0 | Seller registers shop, submits Trade License and NID. Products remain hidden until admin approves KYC. | Seller cannot publish active products while `kyc_status != 'approved'`. |
| **REQ-SEL-002** | Multi-Vendor Tenant Isolation | Seller | P0 | Strict ownership authorization on catalog, stock, and orders. | Seller A cannot read, edit, or delete Seller B's products or orders. Tested via negative API tests. |
| **REQ-SEL-003** | Courier Dispatch Booking | Seller | P0 | Seller marks order as packed and requests courier pickup via Pathao/Steadfast adapter. | System creates courier consignment via API and stores `tracking_no` in `shipments` table. |
| **REQ-ESC-001** | Escrow Fund Holding | System | P0 | Digital payment amounts are placed in `escrow_ledger` with `state = 'held'` upon successful payment webhook. | Funds cannot be withdrawn or paid out to seller while in `held` state. |
| **REQ-ESC-002** | Automated Escrow Release | System | P0 | Escrow funds transition to `state = 'released'` automatically upon courier `DELIVERED` webhook. | Seller ledger balance credits net amount (gross minus platform commission) upon delivery confirmation. |
| **REQ-ESC-003** | Dispute & Escrow Freeze | Buyer / Admin | P0 | Buyer can open dispute within return window, freezing escrow release until admin arbitrates. | Escrow state remains `held` during active dispute. Admin resolution can release to seller or refund buyer. |
| **REQ-LOG-001** | Courier Tracking Webhooks | System | P0 | Courier webhook updates `shipments.status` and transitions order state reliably. | Server validates webhook signature and idempotency key before updating state machine. |
| **REQ-ADM-001** | Immutable Audit Logging | Admin / System | P0 | All administrative state changes, KYC reviews, and financial releases recorded in `audit_logs`. | Log records include `actor_id`, `action`, `entity`, `entity_id`, `meta`, `ip`, and timestamp. Read-only table. |
