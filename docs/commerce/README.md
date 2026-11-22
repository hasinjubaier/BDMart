# Commerce Documentation — Category Overview

## Purpose
The `commerce/` category documents the core commercial mechanics, transactional workflows, dual retail and wholesale pricing rules, order lifecycles, payment and escrow accounting, courier fulfillment adapters, and the B2B RFQ engine for BD Mart.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [catalog-and-pricing.md](file:///d:/Project/BDMart/docs/commerce/catalog-and-pricing.md) | Dual pricing model (retail single unit vs wholesale tiered MOQ), VAT handling, integer poisha math, price display transparency. | Commerce Domain Lead |
| [checkout-and-orders.md](file:///d:/Project/BDMart/docs/commerce/checkout-and-orders.md) | Cart mechanics, upfront delivery fee calculation, multi-seller order splits, complete order lifecycle state machine. | Full-Stack Architect / Commerce Lead |
| [payments-and-escrow.md](file:///d:/Project/BDMart/docs/commerce/payments-and-escrow.md) | SSLCommerz/aamarPay gateway integration, server-to-server IPN callbacks, webhook idempotency, automated escrow ledger transitions. | Security / Financial Systems Architect |
| [fulfillment-and-returns.md](file:///d:/Project/BDMart/docs/commerce/fulfillment-and-returns.md) | Courier 3PL adapters (Pathao/Steadfast), consignment dispatch, tracking lifecycle, returns, cancellations, and dispute workflows. | Logistics / Operations Lead |
| [b2b-purchasing-and-rfq.md](file:///d:/Project/BDMart/docs/commerce/b2b-purchasing-and-rfq.md) | Wholesale ordering workflows, MOQ validation, RFQ lifecycle, quote submission, quote acceptance, and VAT invoice PDF generation. | B2B Business Analyst |

---

## When Each Document is Useful
- Use **`catalog-and-pricing.md`** when implementing catalog search, product detail pricing cards, and volume discount ladders.
- Use **`checkout-and-orders.md`** when implementing cart actions, checkout Server Actions, multi-vendor order partitioning, and order state updates.
- Use **`payments-and-escrow.md`** when configuring payment gateway adapters, writing IPN webhook handlers, or testing escrow release triggers.
- Use **`fulfillment-and-returns.md`** when integrating courier dispatch APIs, parsing shipment status webhooks, or implementing return requests.
- Use **`b2b-purchasing-and-rfq.md`** when developing B2B RFQ creation, seller quoting modals, and Mushak-compliant PDF invoice generators.

---

## Dependencies & Open Decisions
- **Dependencies:** Consumes actor permissions from [docs/product/users-and-roles.md](file:///d:/Project/BDMart/docs/product/users-and-roles.md) and feeds schema requirements to [docs/data-and-api/database-schema.md](file:///d:/Project/BDMart/docs/data-and-api/database-schema.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding platform marketplace commission rates (recommended default: 5% retail, 2% wholesale) and customer dispute window limits (recommended: 7 calendar days post-delivery).
