# Product Scope and Boundaries

## 1. Product Vision & Market Problem
**BD Mart** is an e-commerce platform engineered specifically to solve trust deficits, pricing opacity, and structural friction in Bangladesh's digital economy.

### Key Pain Points Addressed:
1. **Hidden Fees & Checkout Surprises:** Conventional local platforms often add unforeseen shipping fees, gateway charges, or tax surcharges late in the checkout journey. BD Mart guarantees an **upfront, all-inclusive price** (including exact courier delivery) before the buyer enters checkout.
2. **Buyer-Seller Trust Deficit:** High fraud rates in pre-paid commerce and high cancellation/refusal rates in Cash on Delivery (COD). BD Mart introduces an **automated escrow ledger**: buyers' funds are securely held in escrow until third-party courier confirmation proves physical delivery, protecting both buyer and seller.
3. **Fragmented Wholesale Sourcing:** Wholesale buyers currently rely on unorganized phone calls, WhatsApp messages, or offline visits to physical trading hubs (e.g., Chawkbazar, Islampur). BD Mart unites verified manufacturers/distributors and business buyers on the same platform with tiered MOQ pricing and structured RFQs.

---

## 2. Market Model & Ownership Topology
- **Marketplace Model:** Multi-Vendor Commercial Platform. BD Mart operates as the platform operator, payment escrow custodian, and dispute arbiter.
- **Inventory Ownership:** Sellers own their physical inventory. BD Mart does not take title to inventory in Phase 1.
- **Pricing Authority:** Independent sellers set base retail prices, wholesale price tiers, and minimum order quantities.
- **Fulfillment Model:** Sellers pack orders and dispatch via third-party courier partners (Pathao / Steadfast) integrated via platform APIs.

---

## 3. Release 1 (MVP) In-Scope Scope Boundaries

### Core B2C Retail Capabilities:
- Full catalog discovery with fuzzy search, category filtering, and mobile-optimized browsing.
- Bengali (`bn`) primary and English (`en`) secondary locale support with real-time toggle.
- Upfront delivery calculation based on geographic destination (Division/District/Upazila).
- Guest cart and persistent authenticated cart.
- Cash on Delivery (COD) and Digital Payments (SSLCommerz / aamarPay sandbox).
- Order tracking via courier status webhooks.
- Delivered-buyer review and rating system.

### Core B2B Wholesale Capabilities:
- Business account onboarding with mandatory business verification (Trade License, TIN, BIN submission).
- Tiered wholesale pricing (`price_tiers`) hidden from retail buyers and visible exclusively to verified `business_buyer` accounts.
- Enforced Minimum Order Quantity (MOQ) validation at the server level.
- Formal RFQ (Request for Quotation) engine: structured RFQ creation by buyer, quote submission by qualified sellers, quote comparison, buyer acceptance, and automatic conversion to an escrow-backed order.
- Automated VAT-compliant commercial invoice generation (PDF download).

### Seller & Administration:
- Multi-vendor onboarding with KYC documentation upload (Trade License number and NID reference).
- Administrative seller approval workflow.
- Seller dashboard: product CRUD, stock adjustment, order dispatch, revenue reporting, commission breakdown.
- Administrative governance: category management, seller verification, order oversight, dispute arbitration, and immutable audit logging.

---

## 4. Explicit Non-Goals (Deferred / Out-of-Scope for Phase 1)

The following capabilities are deliberately **excluded** from Phase 1 implementation to maintain velocity, minimize operational overhead, and avoid premature scaling complexity:

| Feature / Capability | Classification | Justification & Roadmap Phase |
|---|---|---|
| **Own Delivery Fleet & Warehouses** | Excluded | Relies entirely on 3PL courier APIs (Pathao/Steadfast). 1P fleet deferred to Phase 3. |
| **Credit Lines & Buyer Financing** | Excluded | Introduces NBFI licensing and credit risk. B2B payments remain 100% advance escrow or verified COD. Deferred to Phase 4. |
| **Native Mobile Applications (iOS/Android)** | Excluded | The responsive Next.js PWA delivers mobile-first parity with 48dp hit targets. Native apps deferred to Phase 3. |
| **Multi-Currency & International FX** | Excluded | BD Mart operates strictly in Bangladeshi Taka (BDT / ৳) stored in poisha. Export FX deferred to Phase 4. |
| **Multi-Level Marketing (MLM) & Bidding** | Strictly Prohibited | Prohibited under Bangladesh Digital Commerce Operation Guidelines (2021). |
| **Unlicensed Medicine & Regulated Goods** | Strictly Prohibited | Strictly filtered and rejected during catalog moderation. |
