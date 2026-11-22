# Screen Inventory and Design System Specification

## 1. Design System: Bengal Commerce Core

The visual identity of BD Mart is built upon the **Bengal Commerce Core** design system, combining corporate trustworthiness for institutional trade with vibrant, high-conversion consumer accessibility.

### 1.1. Color Tokens & Palette
| Token Name | Hex Code | Semantic Role |
|---|---|---|
| `primary` (Corporate Navy) | `#153B5B` | B2B headers, enterprise CTAs, bulk negotiation states, navigation framing. |
| `primary-retail` (Retail Green) | `#16A36A` | B2C primary CTAs ("Add to Cart", "Buy Now"), discount badges, positive stock confirmations. |
| `secondary` (Logistics Blue) | `#3478D4` | Tracking states, courier badges, RFQ dynamic status, hyperlinks. |
| `surface-canvas` | `#F7F8FA` | Neutral application background (outdoor daylight optimized). |
| `surface-card` | `#FFFFFF` | Product cards, modal dialogs, elevated containers. |
| `border-hairline` | `#E6E9EE` | 1px card borders and structural dividers. |
| `text-primary` | `#18222E` | High-contrast headline and body typography. |
| `text-secondary` | `#657180` | Metadata, SKU identifiers, secondary specifications. |
| `status-success` | `#168A54` | Verified Seller badge, delivered shipment status, escrow released. |
| `status-warning` | `#E6A23C` | Low stock alert, escrow pending, dispute under review. |
| `status-error` | `#D94848` | Out of stock, payment failed, dispute refund. |

### 1.2. Typography Hierarchy (Plus Jakarta Sans & Noto Sans Bengali)
- **`display-lg`** (32px / 40px line-height, bold 800): Landing page hero banners and campaign titles.
- **`headline-md`** (18px / 24px line-height, bold 700): Product detail titles, supplier headings.
- **`price-lg`** (20px / 24px line-height, extra-bold 800): Primary prices with tabular numerals (`font-variant-numeric: tabular-nums`).
- **`label-sm`** (11px / 14px line-height, bold 700): MOQ tags, stock pills, verified business capsules.
- **Currency Standard:** All prices prefixed directly with the Bengali Taka symbol `৳` (e.g., `৳1,450`), never `BDT` or `Tk.` in UI labels.

### 1.3. Elevation, Shapes & Hit Targets
- **Corner Radii:** Cards: 8px (`rounded-md`); Containers & Bottom Sheets: 16px (`rounded-lg`); Pills/Badges: 9999px (`rounded-full`).
- **Touch Target Ergonomics:** All interactive buttons, chips, and form controls have a minimum touch boundary of **48x48dp**.

---

## 2. Screen Inventory Catalog

The UI encompasses nine core screen archetypes designed and verified in the repository design assets:

| Screen Name | Route Path | Core Components & UI Features |
|---|---|---|
| **B2C Retail Home** | `/[locale]/` | Hero banner carousel, quick category pills, Flash Deals grid, Verified Seller badges, 2-column mobile product cards with floating quick-add button. |
| **B2C Product Detail (PDP)** | `/[locale]/p/[slug]` | 1:1 gallery carousel with thumbnail strip, upfront delivery fee estimator widget, product specs table, verified seller store card, customer review breakdown. |
| **B2C Shopping Cart** | `/[locale]/cart` | Multi-vendor seller groupings, item quantity steppers, live delivery calculation selector (Division/District/Upazila), price breakdown (Subtotal, VAT, Delivery, Total). |
| **B2C Checkout & Payment** | `/[locale]/checkout` | Saved address selector with modal editor, Payment method selector (Cash on Delivery vs SSLCommerz/aamarPay), escrow protection guarantee badge, order submission CTA. |
| **B2B Wholesale Home** | `/[locale]/wholesale` | High-density industrial catalog feed, verified manufacturer credentials, factory lead times, category RFQ quick-launchers. |
| **B2B Wholesale Discovery** | `/[locale]/wholesale/categories` | Faceted search with filters for MOQ range, price tiers, factory certifications, trade license verification status, and fulfillment speed. |
| **B2B Wholesale PDP** | `/[locale]/wholesale/p/[slug]` | Tiered volume pricing matrix ladder (e.g., 50-99, 100-499, 500+), MOQ enforcement indicator, sample order request button, instant RFQ trigger drawer. |
| **Create Buying Request (RFQ)** | `/[locale]/rfq/create` | Multi-step RFQ form: product title, detailed technical specifications, target purchase quantity, target price per unit, delivery deadline, document/CAD file upload. |
| **RFQ Management & Quotes** | `/[locale]/rfq/[id]` | Side-by-side seller quotation comparison matrix (Unit Price, Total Value, Production Lead Time, Sample Availability), quote acceptance button. |
