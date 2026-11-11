# REST API Specification & Endpoint Blueprint (v1.1 Corrected)

## 1. Global API Standards & Conventions

The BDMart backend exposes a **RESTful JSON API** under the base path `/v1`. It adheres to strict HTTP semantics, resource-based URL routing, robust authentication guards, and predictable error formats.

### 1.1 Required Request Headers
- **`Authorization`**: `Bearer <JWT_ACCESS_TOKEN>` (Mandatory for protected endpoints).
- **`Content-Type`**: `application/json` (Mandatory for POST/PUT/PATCH).
- **`Accept-Language`**: `bn-BD` or `en-US` (Controls localization of error messages and category labels).
- **`Idempotency-Key`**: `<UUIDv4>` (Mandatory for payment initiation, checkout, and refund endpoints).

### 1.2 Response Envelope Structure

#### Successful Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-12T03:45:00.000Z",
    "request_id": "req_01h8x9abc",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 154,
      "total_pages": 8
    }
  },
  "error": null
}
```

#### Error Response (RFC 7807 Problem Details)
```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2026-11-12T03:45:01.000Z",
    "request_id": "req_01h8x9abc"
  },
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input parameters provided.",
    "status": 400,
    "details": [
      {
        "field": "phone",
        "issue": "Must be a valid Bangladesh phone number starting with +8801."
      }
    ]
  }
}
```

---

## 2. Complete Endpoint Inventory by Domain

### 2.1 Authentication & Session Management (`/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/auth/otp/request` | Public | Request 6-digit SMS OTP to mobile phone number. |
| `POST` | `/v1/auth/otp/verify` | Public | Verify OTP, authenticate user, return JWT tokens. |
| `POST` | `/v1/auth/password/login` | Public | Authenticate with email/phone and password fallback. |
| `POST` | `/v1/auth/refresh` | Public | Exchange refresh token with family rotation tracking. |
| `POST` | `/v1/auth/logout` | Authenticated | Revoke active refresh token session. |

### 2.2 User Profiles & Addresses (`/v1/users`, `/v1/addresses`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/users/me` | Authenticated | Fetch current user profile, role memberships, and business affiliations. |
| `PATCH` | `/v1/users/me` | Authenticated | Update personal profile (name, avatar, language). |
| `GET` | `/v1/addresses` | Authenticated | List saved shipping and billing addresses. |
| `POST` | `/v1/addresses` | Authenticated | Create a new delivery address with Division, District, Thana validation. |
| `PATCH` | `/v1/addresses/:id` | Authenticated | Edit existing address. |
| `DELETE` | `/v1/addresses/:id` | Authenticated | Soft delete address. |

### 2.3 Business Accounts & Verification (`/v1/businesses`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/businesses` | Authenticated | Register a corporate organization entity. |
| `GET` | `/v1/businesses/me` | Authenticated | Get current user's business organizations. |
| `POST` | `/v1/businesses/:id/documents/presign` | Business Member | Get Cloudflare R2 presigned upload URL for Trade License / e-TIN. |
| `POST` | `/v1/businesses/:id/submit-verification` | Business Owner | Submit verification documents for moderator review. |
| `GET` | `/v1/businesses/:id/members` | Business Owner | List authorized organization members and roles. |
| `POST` | `/v1/businesses/:id/members` | Business Owner | Invite team member (Procurement Officer / Accountant). |

### 2.4 Public Catalog & Discovery (`/v1/catalog`, `/v1/listings`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/catalog/categories` | Public | Fetch hierarchical category taxonomy tree. |
| `GET` | `/v1/catalog/categories/:slug/attributes` | Public | Fetch dynamic attribute schema for category. |
| `GET` | `/v1/catalog/brands` | Public | List verified brands. |
| `GET` | `/v1/catalog/products` | Public | Search products (full-text search, filters, pagination). |
| `GET` | `/v1/catalog/products/:slug` | Public | Get canonical product details, variants, and competing seller offers. |
| `GET` | `/v1/listings/:id` | Public | Get single seller offer details, wholesale tiers, and MOQ. |

### 2.5 Seller Operations (`/v1/seller`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/seller/storefront` | Verified Seller | Configure store profile (logo, banner, description). |
| `GET` | `/v1/seller/listings` | Seller Staff | List seller's active offers and stock balances. |
| `POST` | `/v1/seller/listings` | Seller Staff | Attach offer to canonical product (retail price, MOQ, wholesale tiers). |
| `PATCH` | `/v1/seller/listings/:id` | Seller Staff | Update pricing, MOQ, or availability status. |
| `POST` | `/v1/seller/listings/bulk-import/presign` | Seller Staff | Get R2 presigned URL to upload CSV/XLSX catalog. |
| `POST` | `/v1/seller/listings/bulk-import/process` | Seller Staff | Trigger asynchronous row validation on uploaded file. |
| `PATCH` | `/v1/seller/inventory/:itemId` | Seller Staff | Adjust physical stock quantity in warehouse. |
| `GET` | `/v1/seller/orders` | Seller Staff | List seller sub-orders with status filtering. |
| `PATCH` | `/v1/seller/orders/:id/status` | Seller Staff | Update sub-order state (`ACCEPTED`, `PACKED`). |
| `GET` | `/v1/seller/settlements` | Seller Owner | View earnings ledger, commissions, and bank payout history. |

### 2.6 Multi-Supplier B2B Procurement & Quotations (`/v1/b2b`, `/v1/seller/rfq-requests`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/b2b/rfq-requests` | Verified Buyer | Submit multi-item RFQ broadcast to eligible category suppliers. |
| `GET` | `/v1/b2b/rfq-requests` | Verified Buyer | List buyer's submitted RFQ requests. |
| `GET` | `/v1/b2b/rfq-requests/:id/quotations`| Verified Buyer | Compare competing supplier bids submitted for the RFQ. |
| `POST` | `/v1/b2b/quotations/:id/accept` | Verified Buyer | Accept supplier bid, reject competing bids, convert to draft B2B order. |
| `GET` | `/v1/seller/rfq-requests` | Seller Staff | List inbound RFQs matching seller's approved categories. |
| `GET` | `/v1/seller/rfq-requests/:id` | Seller Staff | View detailed RFQ requirements and buyer target prices. |
| `POST` | `/v1/seller/rfq-requests/:id/quotations` | Seller Staff | Submit independent commercial quotation (price, lead time, fee). |
| `PATCH` | `/v1/seller/quotations/:id` | Seller Staff | Withdraw or adjust quotation prior to acceptance or expiry. |

### 2.7 Carts, Checkout & Orders (`/v1/carts`, `/v1/checkout`, `/v1/orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/carts/me` | Public / Auth | Retrieve shopping cart items and server-calculated totals. |
| `POST` | `/v1/carts/me/items` | Public / Auth | Add listing to cart (enforces strict segregation of B2B and B2C items). |
| `PATCH` | `/v1/carts/me/items/:itemId` | Public / Auth | Update item quantity. |
| `DELETE` | `/v1/carts/me/items/:itemId` | Public / Auth | Remove item from cart. |
| `POST` | `/v1/checkout/preview` | Authenticated | Server-side calculation of subtotals, delivery fees, taxes, and discounts. |
| `POST` | `/v1/checkout/orders` | Authenticated | Place order, reserve stock, split into seller sub-orders (Requires `Idempotency-Key`). |
| `GET` | `/v1/orders` | Authenticated | List customer/buyer order history. |
| `GET` | `/v1/orders/:id` | Authenticated | Get full parent order details and sub-order timelines. |
| `POST` | `/v1/orders/:id/cancel` | Authenticated | Cancel pre-dispatch order and release stock reservation. |

### 2.8 Payments & External Webhooks (`/v1/payments`, `/v1/webhooks`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/payments/:orderId/initiate` | Authenticated | Create payment gateway session (SSLCOMMERZ/bKash). |
| `POST` | `/v1/webhooks/payments/sslcommerz` | Gateway Server | IPN webhook for SSLCOMMERZ transaction completion. |
| `POST` | `/v1/webhooks/payments/bkash` | Gateway Server | Webhook for bKash payment execution. |
| `POST` | `/v1/webhooks/shipping/:courier` | Courier Server | Courier tracking milestone webhook (Pathao/Steadfast/RedX). |

### 2.9 Internal Administration & Moderation (`/v1/admin`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/admin/verifications/pending` | Moderator | List businesses pending trade license review. |
| `POST` | `/v1/admin/verifications/:id/decision`| Moderator | Approve or reject business verification. |
| `GET` | `/v1/admin/catalog/pending` | Moderator | Review newly proposed canonical products. |
| `POST` | `/v1/admin/catalog/:id/decision` | Moderator | Approve, reject, or merge canonical product. |
| `GET` | `/v1/admin/disputes` | Support Staff | List buyer-seller order disputes. |
| `POST` | `/v1/admin/disputes/:id/resolve` | Support Staff | Arbitrate dispute, enforce return or release payout. |
| `GET` | `/v1/admin/audit-logs` | Super Admin | Query system-wide security and mutation audit trail. |
