# API Contracts and Validation Specification

## 1. Input Validation Architecture (Zod Mandate)

Every external input entering BD Mart (Server Action payloads, REST route requests, incoming webhooks, and Claude AI JSON output) must be strictly parsed using **Zod** schemas defined in `src/lib/validators/*`.

---

## 2. Core Server Action Contracts

### 2.1. Checkout & Order Submission (`submitOrderAction`)
- **Actor:** `buyer` or `business_buyer`
- **Authentication:** Required (`requireRole(['buyer', 'business_buyer'])`)
- **Zod Input Schema:**
  ```typescript
  export const SubmitOrderSchema = z.object({
    addressId: z.string().uuid(),
    paymentMethod: z.enum(['cod', 'sslcommerz', 'aamarpay']),
    items: z.array(z.object({
      variantId: z.string().uuid(),
      qty: z.number().int().positive(),
    })).min(1, 'Order must contain at least one item'),
  });
  ```
- **Response Schema:**
  ```typescript
  export type SubmitOrderResponse = 
    | { success: true; orderId: string; redirectUrl?: string; orderTotalPoisha: number }
    | { success: false; errorCode: string; errorMessage: string };
  ```
- **Error Codes:**
  - `OUT_OF_STOCK`: One or more items requested exceed available variant inventory.
  - `MOQ_NOT_MET`: Quantity requested is below seller's Minimum Order Quantity.
  - `INVALID_ADDRESS`: Selected delivery address ID does not belong to buyer.

---

### 2.2. B2B RFQ Creation (`createRFQAction`)
- **Actor:** `business_buyer` (Verified)
- **Authentication:** Required (`requireRole(['business_buyer'])` with verified business record)
- **Zod Input Schema:**
  ```typescript
  export const CreateRFQSchema = z.object({
    title: z.string().min(5).max(255),
    spec: z.string().min(20).max(5000),
    qty: z.number().int().min(50, 'Wholesale RFQs require at least 50 units'),
    targetPricePoisha: z.number().int().positive().optional(),
    expiresInDays: z.number().int().min(3).max(30).default(14),
  });
  ```
- **Response Schema:**
  ```typescript
  export type CreateRFQResponse = 
    | { success: true; rfqId: string; status: 'OPEN'; expiresAt: string }
    | { success: false; errorCode: string; errorMessage: string };
  ```

---

### 2.3. Seller Quote Submission (`submitQuoteAction`)
- **Actor:** `seller` (Approved KYC)
- **Authentication:** Required (`requireRole(['seller'])`)
- **Zod Input Schema:**
  ```typescript
  export const SubmitQuoteSchema = z.object({
    rfqId: z.string().uuid(),
    unitPricePoisha: z.number().int().positive(),
    leadDays: z.number().int().min(1).max(90),
  });
  ```

---

## 3. Webhook Route Handlers

### 3.1. Payment Webhook (`POST /api/webhooks/payment`)
- **Source:** Payment Gateway Server IPN (SSLCommerz / aamarPay)
- **Validation:** Gateway signature header and IP allow-list verification.
- **Request Payload Schema:**
  ```typescript
  export const PaymentWebhookSchema = z.object({
    tran_id: z.string(),
    val_id: z.string(),
    amount: z.string(),
    card_type: z.string(),
    status: z.enum(['VALID', 'FAILED', 'CANCELLED']),
    currency_amount: z.string(),
    verify_sign: z.string(),
    verify_key: z.string(),
  });
  ```
- **Response:**
  - `HTTP 200 OK` with `{ status: 'SUCCESS', idempotency_status: 'PROCESSED' }`
  - `HTTP 400 Bad Request` on invalid signature or mismatched transaction amount.

---

### 3.2. Courier Status Webhook (`POST /api/webhooks/courier`)
- **Source:** 3PL Courier System (Pathao / Steadfast)
- **Validation:** `X-Courier-Signature` HMAC SHA-256 header.
- **Request Payload Schema:**
  ```typescript
  export const CourierWebhookSchema = z.object({
    consignment_id: z.string(),
    tracking_code: z.string(),
    order_id: z.string().uuid(),
    event: z.enum(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'FAILED']),
    timestamp: z.string(),
  });
  ```
- **Response:**
  - `HTTP 200 OK` on valid status update.
