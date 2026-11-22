# Sitemap and Navigation Specification

## 1. Localized URL Routing Architecture

BD Mart uses Next.js App Router localized dynamic segment architecture (`src/app/[locale]/...`), where `locale` is either `bn` (Bengali, default) or `en` (English).

```text
src/app/[locale]/
├── (store)/                 # B2C Retail & Shared Consumer Experience
│   ├── page.tsx             # /[locale] (Homepage)
│   ├── categories/          # /[locale]/categories (Category Explorer)
│   │   └── [slug]/          # /[locale]/categories/[slug] (Category Feeds)
│   ├── p/[slug]/            # /[locale]/p/[slug] (Product Detail Page - PDP)
│   ├── cart/                # /[locale]/cart (Shopping Cart & Upfront Shipping)
│   └── checkout/            # /[locale]/checkout (Order Review & Payment)
│       └── success/         # /[locale]/checkout/success (Order Confirmation)
├── (business)/              # B2B Wholesale Experience
│   ├── wholesale/           # /[locale]/wholesale (B2B Wholesale Hub)
│   ├── wholesale/p/[slug]/  # /[locale]/wholesale/p/[slug] (B2B Wholesale PDP)
│   ├── rfq/                 # /[locale]/rfq (RFQ Hub - Browse/Manage RFQs)
│   └── rfq/create/          # /[locale]/rfq/create (Submit Buying Request)
├── (account)/               # Buyer & Business Account Portal
│   ├── profile/             # /[locale]/profile (Personal & Company Details)
│   ├── orders/              # /[locale]/orders (Order History & Tracking)
│   │   └── [orderId]/       # /[locale]/orders/[orderId] (Order Detail & Invoices)
│   ├── disputes/            # /[locale]/disputes (File / Review Disputes)
│   └── business-verify/     # /[locale]/business-verify (Submit TIN/BIN)
├── (seller)/                # KYC-Verified Seller Management Portal
│   ├── dashboard/           # /[locale]/seller/dashboard (Metrics & Revenue)
│   ├── products/            # /[locale]/seller/products (Catalog CRUD & Stock)
│   ├── orders/              # /[locale]/seller/orders (Order Fulfillment & Dispatch)
│   ├── quotes/              # /[locale]/seller/quotes (Respond to Open RFQs)
│   └── kyc/                 # /[locale]/seller/kyc (Upload Trade License & NID)
└── (admin)/                 # Administrative Control Panel
    ├── dashboard/           # /[locale]/admin/dashboard (Platform Overview)
    ├── sellers/             # /[locale]/admin/sellers (KYC Approval Queue)
    ├── businesses/          # /[locale]/admin/businesses (TIN/BIN Verification)
    ├── disputes/            # /[locale]/admin/disputes (Dispute Arbitration)
    └── audit-logs/          # /[locale]/admin/audit-logs (Security Audit Trail)
```

---

## 2. Navigation Paradigms: Dual Persona Experience

### 2.1. Top Navigation Bar (Header)
- **Store Switcher:** A prominent toggle in the navigation header allows toggling between **"Retail Store" (খুচরা দোকান)** and **"Wholesale B2B" (পাইকারি বাজার)**.
- **Search Bar:** Centered search pill with category selector prefix and search icon.
- **Language Switcher:** Seamless `BN / EN` toggle updating route locale while preserving query parameters.
- **User Account & Cart Pill:** Badged shopping cart counter with live price total.

### 2.2. Mobile Bottom Navigation Bar (Android M3 Baseline)
On mobile viewports (<600dp), a dedicated 64dp bottom navigation bar remains affixed to the bottom:
1. **Home (`/`)**: Main marketplace discovery feed.
2. **Categories (`/categories`)**: Visual taxonomy drill-down with sticky category tabs.
3. **B2B / RFQ Hub (`/wholesale` or `/rfq`)**: Wholesale discovery and buying requests.
4. **Orders / Tracking (`/orders`)**: Real-time delivery tracking and history.
5. **Account (`/profile`)**: User profile, company verification, and settings.

### 2.3. Sticky PDP Bottom Action Bars
- **B2C Mode:** Displays upfront final price on the left; prominent solid Green (`#16A36A`) "Add to Cart" button on the right (48dp height).
- **B2B Mode:** Displays selected volume tier total and MOQ on the left; split actions on the right: "Sample Order" (secondary outlined) and "Start Order / RFQ" (corporate Navy `#153B5B`).
