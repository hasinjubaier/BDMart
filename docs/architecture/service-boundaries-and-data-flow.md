# Service Boundaries and Data Flow Specification

## 1. The Strict 4-Layer Architectural Invariant

BD Mart enforces a strict unidirectional layering hierarchy. UI components are **strictly forbidden** from accessing database tables directly.

```text
Layer 1: Presentation Tier (src/app/[locale]/..., src/components/...)
   │  - Server Components (RSC) and Client Components
   │  - Form presentation, UX feedback, and layout rendering
   ▼
Layer 2: Action & Transport Tier (Server Actions & src/app/api/*)
   │  - Session authentication & role verification (requireRole)
   │  - Input parsing and validation (Zod)
   │  - Transport mapping and HTTP response headers
   ▼
Layer 3: Domain Service Tier (src/server/services/*)
   │  - Core business logic: OrderService, EscrowService, CatalogService
   │  - Price calculations, MOQ validation, and state machine enforcement
   │  - Cross-cutting operations: audit logging, notifications
   ▼
Layer 4: Data & Integration Tier (src/db/*, src/lib/*)
   │  - Drizzle ORM schema, migrations, and database queries
   │  - Third-party adapters: SSLCommerz, Pathao, Claude API
```

---

## 2. Server-Side Business Logic Isolation

All critical business calculations reside exclusively within Layer 3 (`src/server/services/*`):

### Forbidden Patterns:
- Calculating order totals, discounts, or VAT inside React components.
- Trusting client-supplied price parameters submitted via forms or API payloads.
- Directly updating `orders.status` from a client-side button click without invoking the service state machine.

### Enforced Service Pattern:
```typescript
// src/server/services/order.ts
export async function confirmOrderPayment(orderId: string, txnId: string, gatewayAmountPoisha: number) {
  return await db.transaction(async (tx) => {
    // 1. Fetch order with row-level lock
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');

    if (!order) {
      throw new NotFoundError('Order does not exist.');
    }

    // 2. Validate state transition
    if (order.status !== 'PENDING') {
      throw new ConflictError(`Cannot confirm order in state ${order.status}.`);
    }

    // 3. Reconcile exact monetary amounts
    if (order.total !== BigInt(gatewayAmountPoisha)) {
      throw new FinancialDiscrepancyError('Payment amount does not match order total.');
    }

    // 4. Atomic updates
    await tx.update(orders).set({ status: 'CONFIRMED', updatedAt: new Date() }).where(eq(orders.id, orderId));

    await tx.insert(escrowLedger).values({
      orderId: order.id,
      amount: order.subtotal,
      state: 'held',
      createdAt: new Date(),
    });

    return order;
  });
}
```

---

## 3. Data Ownership & Tenant Boundary Rules

1. **Seller Isolation:** Any query executed by a seller must append `where(eq(table.sellerId, currentSellerId))`. Sellers attempting to inspect foreign orders or products are blocked and logged as an authorization violation.
2. **Business Account Isolation:** RFQ quotes and B2B orders are isolated by `company_id`. Multiple buyers belonging to the same company access shared procurement history, while remaining completely invisible to external competing businesses.
3. **Admin Governance:** Administrative actions must be authenticated with `role === 'admin'`. Every administrative read of sensitive data (e.g., decrypted NID or bank account) and every mutation writes an immutable entry into `audit_logs`.
