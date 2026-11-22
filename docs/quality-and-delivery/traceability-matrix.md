# Requirements Traceability Matrix

This matrix maps every confirmed Functional Requirement (`REQ-*`) to its UX implementation, Database Schema entities, API/Server Action handlers, and automated test specifications (`TEST-*`).

| Requirement ID | Requirement Title | UX Screen / Component | DB Entities & Tables | API / Server Action | Automated Test Specification |
|---|---|---|---|---|---|
| **REQ-PRD-001** | Dual-Language (`bn`/`en`) | Header Language Toggle, `next-intl` | `users.locale`, `messages/*.json` | `/[locale]/...` App Router | `TEST-E2E-001`: Verify locale toggle switches text without reload. |
| **REQ-PRD-002** | Integer Poisha Currency | Price display cards, Cart totals | All monetary columns (`bigint`) | `formatBDT()` utility | `TEST-UNIT-001`: Verify poisha-to-BDT arithmetic & rounding precision. |
| **REQ-PRD-003** | Upfront Delivery Fee | PDP Estimator, Cart Review | `addresses`, `orders.delivery_fee` | `calculateDeliveryFeeAction` | `TEST-UNIT-002`: Verify zone delivery fees (Dhaka vs Outside Dhaka). |
| **REQ-B2C-001** | B2C Catalog Discovery | Retail Home, Category Feeds | `products`, `categories` | `getCatalogProducts()` | `TEST-E2E-002`: Search, category filtering, and mobile LCP < 2.5s. |
| **REQ-B2C-002** | Guest Cart to Auth | Cart screen, Login Sheet | `carts`, `cart_items`, `users` | `syncGuestCartAction` | `TEST-E2E-003`: Verify guest cart items bind to user on phone OTP login. |
| **REQ-B2C-003** | Dual Payment (COD / Digital) | Checkout Payment Step | `payments`, `orders` | `submitOrderAction` | `TEST-E2E-004`: Complete COD order and SSLCommerz sandbox order. |
| **REQ-B2C-004** | Delivered-Only Reviews | Product Review Section | `reviews`, `order_items`, `orders` | `submitReviewAction` | `TEST-INT-001`: Negative test verifying 403 if item not DELIVERED. |
| **REQ-B2B-001** | Business Buyer Verification | B2B Registration Form | `businesses`, `users` | `submitBusinessKYCAction` | `TEST-INT-002`: Verify B2B pricing hidden until `verified_at != null`. |
| **REQ-B2B-002** | Tiered Wholesale Pricing | Wholesale PDP, Tier Table | `price_tiers`, `products` | `getWholesaleProductDetails()` | `TEST-INT-003`: Verify retail buyer cannot retrieve price tiers via API. |
| **REQ-B2B-003** | Server-Side MOQ Enforcement | Wholesale Action Bar | `products.moq`, `orders` | `validateB2BOrderLine()` | `TEST-UNIT-003`: Negative test verifying order reject when qty < MOQ. |
| **REQ-B2B-004** | RFQ Creation & Quoting | RFQ Hub, Quote Matrix | `rfqs`, `rfq_quotes` | `createRFQAction`, `submitQuoteAction` | `TEST-E2E-005`: Multi-seller quote submission and quote acceptance. |
| **REQ-B2B-005** | VAT Mushak 6.3 Tax Invoice | Order Detail Download | `orders`, `businesses`, `sellers` | `generateInvoicePdfAction` | `TEST-UNIT-004`: Verify 15% VAT breakdown and PDF metadata format. |
| **REQ-SEL-001** | Seller KYC Verification | Seller Portal KYC Form | `sellers` (`kyc_status`), Firebase Storage | `submitSellerKYCAction` | `TEST-INT-004`: Seller cannot publish product while KYC pending. |
| **REQ-SEL-002** | Multi-Vendor Tenant Isolation | Seller Dashboard | `products`, `orders`, `sellers` | `requireOwnership()` | `TEST-INT-005`: Negative test verifying Seller A cannot read Seller B data. |
| **REQ-SEL-003** | Courier Dispatch Booking | Seller Order Detail | `shipments`, `orders` | `createShipmentAction` | `TEST-INT-006`: Generates courier tracking code and shipment record. |
| **REQ-ESC-001** | Escrow Fund Holding | Payment Confirmation | `escrow_ledger` (`state: held`) | `processPaymentWebhook()` | `TEST-INT-007`: Verify payment creates escrow record in held state. |
| **REQ-ESC-002** | Automated Escrow Release | Delivery Webhook Handler | `escrow_ledger` (`state: released`) | `processCourierWebhook()` | `TEST-INT-008`: Verify courier DELIVERED triggers escrow release. |
| **REQ-ESC-003** | Dispute Escrow Freeze | Dispute Modal Form | `disputes`, `escrow_ledger` | `openDisputeAction` | `TEST-INT-009`: Verify dispute freezes escrow release. |
| **REQ-LOG-001** | Courier Tracking Webhooks | Tracking Timeline Widget | `shipments.status`, `orders` | `POST /api/webhooks/courier` | `TEST-INT-010`: Verify courier webhook updates order and shipment state. |
| **REQ-ADM-001** | Immutable Audit Logging | Admin Audit Log Viewer | `audit_logs` | `logAuditEvent()` | `TEST-INT-011`: Verify admin action appends immutable audit log. |
