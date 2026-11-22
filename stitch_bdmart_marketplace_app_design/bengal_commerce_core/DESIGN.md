---
name: Bengal Commerce Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbeb'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e5efff'
  surface-container-high: '#dfe9fa'
  surface-container-highest: '#d9e3f4'
  on-surface: '#121c28'
  on-surface-variant: '#42474e'
  inverse-surface: '#27313e'
  inverse-on-surface: '#e9f1ff'
  outline: '#73777e'
  outline-variant: '#c3c7ce'
  surface-tint: '#3f6183'
  primary: '#002540'
  on-primary: '#ffffff'
  primary-container: '#153b5b'
  on-primary-container: '#84a5cb'
  inverse-primary: '#a7caf1'
  secondary: '#006d44'
  on-secondary: '#ffffff'
  secondary-container: '#7df7b6'
  on-secondary-container: '#007147'
  tertiary: '#00234c'
  on-tertiary: '#ffffff'
  tertiary-container: '#003873'
  on-tertiary-container: '#68a3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#a7caf1'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#26496a'
  secondary-fixed: '#80fab9'
  secondary-fixed-dim: '#62dd9e'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005232'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#a9c7ff'
  on-tertiary-fixed: '#001b3d'
  on-tertiary-fixed-variant: '#00468c'
  background: '#f8f9ff'
  on-background: '#121c28'
  surface-variant: '#d9e3f4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
  price-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 24px
  price-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.5rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-trust, dual-engine marketplace architecture tailored for the fast-evolving Bangladeshi digital economy with global export parity. It bridges the energetic, high-density accessibility of consumer shopping (Daraz, Mercado Libre) with the structured, transactional rigor required for bulk business trade (Alibaba, Amazon Business).

The design language sits at the intersection of **Modern Corporate Commerce** and **Material 3 Utility**:
- **Trust & Velocity:** The UI feels solid, institutional, and dependable, shedding clutter in favor of scannable product cards, deterministic status indicators, and clear transaction paths.
- **Dual-Persona Architecture:** 
  - **B2C Mode:** Driven by energetic green value accents, visual deal mechanics, immediate unit pricing in Bangladeshi Taka (৳), ratings badges, and high-engagement consumer cards.
  - **B2B Mode:** Characterized by deep corporate navy surfaces, verified manufacturer credentials, clear tiered MOQ (Minimum Order Quantity) ladders, instant RFQ (Request for Quote) triggers, and industrial specifications.
- **Native Android First:** Strictly honors tactile touch feedback, 48dp baseline hit targets, dedicated M3 bottom navigation, elevated sheets, and sticky contextual action bars optimized for single-handed mobile interactions.

## Colors

The palette balances institutional authority with high-converting retail energy:

- **Primary Navy (`#153B5B`):** The foundational anchor. Dictates B2B headers, enterprise headers, primary enterprise CTAs, bulk negotiation states, and navigation framing.
- **Primary Retail Green (`#16A36A`):** The vitality engine. Governs B2C conversions, "Add to Cart", discount callouts, checkout flows, and positive stock confirmations.
- **Secondary Blue (`#3478D4`):** Logistics, messaging, dynamic RFQ states, track-and-trace notifications, and link interactions.
- **Neutral Primary Text (`#18222E`) & Secondary Text (`#657180`):** Tuned for legibility under bright outdoor daylight conditions on varying mobile OLED/LCD panels.
- **Surfaces & Borders:** Baseline canvas background is `#F7F8FA`, layered against pure `#FFFFFF` cards and structural hairpins defined by `#E6E9EE`.
- **System Feedback:** Controlled by `#168A54` (Success/Verified Supplier), `#E6A23C` (Warning/Low Stock/Escrow Pending), and `#D94848` (Error/Out of Stock).

## Typography

The type system is standardized on **Plus Jakarta Sans** across all screen densities. Its geometric backbone delivers sharp numerical clarity for tabular financial data, currency marks (৳), and technical B2B specs, while its humanist terminals offer consumer warmth.

- **Numerics & Pricing (`price-lg`, `price-sm`):** Configured with tabular figures for aligned comparison tables, cart totals, and tier breakdowns.
- **Hierarchy Enforcers:**
  - `display-lg`: Major landing page promotional headlines and trade event hero banners.
  - `headline-md` & `headline-sm`: Product titles, supplier profile headers, and modal drawer titles.
  - `label-sm`: Micro-capsules, stock status pills, verified business labels, and wholesale MOQ tags.
- **Bengali Currency Consistency:** Ensure all references to currency use the standard `৳` symbol prefixed directly to digits without extra spacing (e.g., `৳1,450`), rendered at weights matched strictly to the active price level.

## Layout & Spacing

The layout employs an adaptive fluid grid optimized for high-density e-commerce catalog parsing:

- **Mobile Canvas (<600dp):** 4-column fluid layout with `0.75rem` outer margins and `0.5rem` gutters. Product feeds arrange strictly as 2-column cards to maximize image discovery and vertical scrolling cadence.
- **Tablet / Split Screen (600dp–840dp):** 8-column layout with `1rem` margins and gutters, supporting persistent side drawers for filters and category navigation.
- **Desktop / Web Extension (>840dp):** 12-column layout maxed at 1280px container width.
- **Touch Ergonomics:** Interactive targets adhere strictly to the 48x48dp minimum boundary. Critical bottom sheets, quick buy drawers, and wholesale inquiries rest within the lower thumb zone (bottom 40% of viewport).

## Elevation & Depth

Visual depth is achieved through crisp physical card tiers rather than heavy visual noise, maintaining rendering performance across low-to-mid tier mobile devices:

- **Level 0 (Canvas):** `#F7F8FA` background with zero elevation.
- **Level 1 (Default Cards & Tiles):** Pure `#FFFFFF` surfaces bounded by a continuous 1px hairline border in `#E6E9EE`. Ambient shadow is subtle: `0 1px 3px rgba(24, 34, 46, 0.05)`.
- **Level 2 (Interactive Overlays & Quick Cards):** Dropdown menus, filtered search popups, and elevated cart summaries use: `0 4px 12px rgba(21, 59, 91, 0.08)`.
- **Level 3 (Modal Bottom Sheets & Floating Bars):** Android sticky bottom navigation and multi-step RFQ bottom sheets leverage: `0 -4px 20px rgba(21, 59, 91, 0.12)`.
- **B2B Distinction:** Enterprise modules eliminate ambient blur in favor of structured nesting—using subtle filled background contrasts (`#F0F3F7`) with crisp `#E6E9EE` dividers to signal transactional stability.

## Shapes

The design system adopts a **Rounded (`2`)** shape architecture, balancing modern approachable retail feel with structured industrial stability:

- **Cards & Surfaces:** Standardized at `0.5rem` (8px) corner radius.
- **Containers & Bottom Sheets (`rounded-lg` / `rounded-xl`):** Bottom sheets utilize `1rem` (16px) top-left and top-right radii; major highlight dialogs utilize `1.5rem` (24px).
- **Pills & Status Capsules:** Chips, verified tags, discount flags, and rating counters use full pill shapes (`9999px`) for immediate semantic scanning.
- **Input Fields & Buttons:** Standardized at `0.5rem` (8px) to reinforce tactile button surfaces that conform to Material 3 interaction standards.

## Components

### Buttons
- **B2C Primary Action ("Add to Cart", "Buy Now"):** Solid `#16A36A` fill, white text, 48dp height, 8px corner radius, bold label. Pressed state ripples to `#128254`.
- **B2B Primary Action ("Request for Quote", "Contact Supplier"):** Solid `#153B5B` fill, white text, 48dp height, 8px corner radius. Ripple state shifts to `#0E273D`.
- **Secondary Outlined:** 1.5px border `#153B5B` (B2B) or `#16A36A` (B2C), transparent background, label matching border color.
- **Ghost/Tertiary:** Zero border, padding-compressed for navigation actions and clear-all filters.

### Chips & Badges
- **B2B Verified Supplier Badge:** `#153B5B` background or deep tint `#EBF2F7`, `#153B5B` text, integrated shield icon, pill-shaped.
- **MOQ Tier Chip:** Neutral surface `#F0F3F7` with `#18222E` text (e.g., `MOQ: 500 pcs · ৳120/pc`).
- **B2C Discount Pill:** `#D94848` or `#E6A23C` fill with white text, font size `11px`, placed over the top-left of product thumbnails.
- **Star Rating Chip:** Tinted background (`#FEF8E7`), `#E6A23C` star icon, `#18222E` bold numerical text.

### Product Cards
- **B2C Card:** Image ratio 1:1, full-bleed thumbnail, subtle 8px border-radius, product title (2 lines max truncated), bold green unit price (`৳450`), strike-through original price, star rating badge, and single-tap floating round cart button.
- **B2B Wholesale Card:** Dual horizontal or vertical card layout. Displays supplier company name with verified badge, primary unit/bulk tiered price (`৳85 - ৳110 / piece`), minimum order quantity label, fast RFQ button, and country/origin flag.

### Input Fields & Controls
- **Search Bar:** Centered search pill or 8px rounded box, `#FFFFFF` fill, `#E6E9EE` border, prefix icon for category selection, suffix icon for barcode/image lookup.
- **Checkboxes & Radios:** 20dp hit-box within 48dp touch region. Primary fill is `#16A36A` for retail flows and `#153B5B` for bulk order matrix selections.
- **Quantity Matrix Stepper (B2B):** Segmented inline increment control with clear manual keypad entry for high-volume inputs (e.g., 100, 500, 1000+).

### Navigation & Android System Bars
- **Bottom Navigation Bar:** Height 64dp, `#FFFFFF` background, top border 1px `#E6E9EE`. Contains 5 primary destinations: Home, Categories, RFQ Hub/B2B, Messages, and Account. Active item receives primary tint with subtle background pill indicator.
- **Sticky Wholesale Bottom Bar:** Stays affixed to screen bottom on PDP: Left side displays calculated order total based on selected tier, right side provides split primary actions: "Sample Order" (secondary outlined) and "Start Order / RFQ" (primary navy).