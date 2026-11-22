# Audit Logging and Fraud Prevention Specification

## 1. Immutable Audit Logging Architecture

BD Mart maintains an immutable security audit trail in the `audit_logs` table. Audit logs are **append-only**; updates and deletions are restricted at the database privilege level.

### Auditable Security Events:
- `USER_LOGIN_SUCCESS` / `USER_LOGIN_FAILED`
- `SELLER_KYC_SUBMITTED` / `SELLER_KYC_APPROVED` / `SELLER_KYC_REJECTED`
- `BUSINESS_BUYER_VERIFIED`
- `PRODUCT_CREATED` / `PRODUCT_PRICE_UPDATED` / `PRODUCT_DEACTIVATED`
- `ORDER_CREATED` / `ORDER_CONFIRMED` / `ORDER_CANCELLED`
- `PAYMENT_WEBHOOK_RECEIVED` / `PAYMENT_VALIDATION_FAILED`
- `ESCROW_FUNDS_HELD` / `ESCROW_FUNDS_RELEASED` / `ESCROW_FUNDS_REFUNDED`
- `DISPUTE_OPENED` / `DISPUTE_ARBITRATED`
- `ADMIN_ROLE_GRANTED`

### Audit Log Schema Structure:
```sql
-- PostgreSQL Append-Only Enforcement
REVOKE UPDATE, DELETE ON audit_logs FROM bdmart_app_user;
```

---

## 2. Fraud Prevention & Collusion Defenses

### 2.1. Self-Purchasing & Review Collusion Prevention
- Sellers are strictly prevented from purchasing their own products. Server Action verifies `cartItem.sellerId !== currentUserId`.
- Reviews and ratings can **only** be submitted if the buyer has a verified `order_items` record with status `DELIVERED`. Attempting to submit a review without delivered purchase history results in `403 Forbidden`.

### 2.2. Payment Amount Tampering Prevention
- If an attacker intercepts the client checkout payload and submits `amount = 1`, the server completely ignores the client parameter and recalculates the exact total from the database variant price, active quantity tier, upfront delivery fee, and applicable VAT.
- When the payment gateway returns an IPN, the server validates:
  $$\text{gatewayPayload.amount} == \text{order.total}$$
  If the amount differs by even 1 poisha, the order is locked, the payment is rejected, and an alert is dispatched to security operations.

### 2.3. Compliance with Bangladesh Digital Commerce Guidelines (2021)
- **Mandatory Order Confirmation:** Order confirmed within 48 hours of booking.
- **Delivery Timeline Enforcement:** Intra-city delivery within 5 days; inter-city delivery within 10 days. The system automatically alerts platform administrators if a shipment remains in transit past these thresholds.
- **Escrow Buffer:** Sellers do not receive payouts until delivery confirmation is cryptographically verified by the 3PL courier API.
