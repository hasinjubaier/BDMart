# State Machines Specification

## 1. Formal System State Machines

BD Mart models all multi-step lifecycles as deterministic finite state machines. Invalid or unauthorized transitions are rejected and recorded as security anomalies.

---

## 2. Order State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Placed
    PENDING --> CONFIRMED: Payment Confirmed (IPN / COD Phone)
    PENDING --> CANCELLED: Payment Failed / Timeout / Buyer Cancel
    CONFIRMED --> PROCESSING: Seller Packs Items
    CONFIRMED --> CANCELLED: Out of Stock (Refund to Buyer)
    PROCESSING --> SHIPPED: Courier Handover
    SHIPPED --> DELIVERED: Courier Webhook
    SHIPPED --> RETURNED: Doorstep Refusal / Address Not Found
    DELIVERED --> DISPUTED: Buyer Files Dispute (7-Day Window)
    DELIVERED --> COMPLETED: 7-Day Window Passes (Escrow Released)
    DISPUTED --> COMPLETED: Dispute Resolved in Seller Favor
    DISPUTED --> REFUNDED: Dispute Resolved in Buyer Favor
    COMPLETED --> [*]
    CANCELLED --> [*]
    RETURNED --> [*]
    REFUNDED --> [*]
```

---

## 3. Escrow Ledger State Machine

```mermaid
stateDiagram-v2
    [*] --> held: Digital Payment Confirmed (CONFIRMED Order)
    held --> frozen: Buyer Files Dispute
    frozen --> held: Admin Requests Further Evidence
    frozen --> released: Dispute Resolved (Seller Upheld)
    frozen --> refunded: Dispute Resolved (Buyer Refunded)
    held --> released: Order DELIVERED + Dispute Window Cleared
    held --> refunded: Order Cancelled Prior to Dispatch
    released --> [*]
    refunded --> [*]
```

### Transition Invariants:
1. `held` $\rightarrow$ `released` requires either:
   - Courier shipment status `DELIVERED` AND `now() >= delivered_at + 7 days`.
   - Buyer explicit manual confirmation of satisfaction.
   - Admin dispute judgment (`DISPUTE_SELLER_WIN`).
2. Once an escrow record reaches `released` or `refunded`, it is in an immutable terminal state.

---

## 4. Seller KYC State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Seller Registers & Uploads Trade License
    pending --> approved: Admin Verifies Trade License & NID
    pending --> rejected: Incomplete / Fraudulent Documentation
    rejected --> pending: Seller Re-submits Revised Documentation
    approved --> suspended: Seller Breaches SLA / Excessive Disputes
    suspended --> approved: Admin Reinstates Seller
```

---

## 5. RFQ Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: Business Buyer Publishes RFQ
    OPEN --> UNDER_EVALUATION: Bidding Closes (expires_at reached)
    OPEN --> ACCEPTED: Buyer Accepts a Seller Quote
    UNDER_EVALUATION --> ACCEPTED: Buyer Accepts a Quote
    OPEN --> CANCELLED: Buyer Withdraws RFQ
    UNDER_EVALUATION --> EXPIRED: No Quote Accepted within 14 Days
    ACCEPTED --> [*]: Auto-converts to Wholesale Order
    CANCELLED --> [*]
    EXPIRED --> [*]
```
