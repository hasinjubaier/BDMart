# UI/UX Documentation — Category Overview

## Purpose
The `ux/` category specifies the site map, screen catalog, Bengal Commerce Core design system tokens, critical buyer and staff user journeys, responsive mobile-first layouts, internationalization architecture (`next-intl`), and accessibility compliance (WCAG 2.2 AA).

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [sitemap-and-navigation.md](file:///d:/Project/BDMart/docs/ux/sitemap-and-navigation.md) | Hierarchical route inventory, localized URL structures (`/[locale]/...`), and dual-persona navigation. | UI/UX Lead |
| [screen-inventory-and-design-system.md](file:///d:/Project/BDMart/docs/ux/screen-inventory-and-design-system.md) | Visual design tokens, Bengal Commerce Core typography, color system, and UI screen catalog. | Design Systems Lead / Frontend Architect |
| [critical-user-journeys.md](file:///d:/Project/BDMart/docs/ux/critical-user-journeys.md) | Step-by-step buyer, seller, and admin user journeys, including error states and network recovery flows. | UX Researcher / QA Lead |
| [accessibility-and-i18n.md](file:///d:/Project/BDMart/docs/ux/accessibility-and-i18n.md) | WCAG 2.2 AA compliance standards, keyboard traps, screen reader ARIA roles, and `next-intl` localization. | Frontend Accessibility Specialist |

---

## When Each Document is Useful
- Use **`sitemap-and-navigation.md`** when creating Next.js App Router folders and navigation headers/bottom bars.
- Use **`screen-inventory-and-design-system.md`** when configuring Tailwind CSS theme tokens (`tailwind.config.ts`), creating shadcn/ui components, or styling product cards.
- Use **`critical-user-journeys.md`** when implementing user flows, writing Playwright E2E tests, or designing loading/error boundary states.
- Use **`accessibility-and-i18n.md`** when setting up translation message dictionaries (`messages/bn.json`, `messages/en.json`) or configuring `@axe-core/playwright`.

---

## Dependencies & Open Decisions
- **Dependencies:** Translates business requirements from [docs/product/](file:///d:/Project/BDMart/docs/product/README.md) into concrete UI contracts. Supplies component layout specifications to [docs/architecture/](file:///d:/Project/BDMart/docs/architecture/README.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding mobile guest checkout authentication timing (at cart vs at final order submission).
