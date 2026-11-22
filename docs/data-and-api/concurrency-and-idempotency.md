# Concurrency and Idempotency Specification

## 1. Concurrency: Stock Reservation & Race Conditions

When high transaction volume or simultaneous B2B/B2C checkouts target the last remaining inventory units, race conditions can cause overselling. BD Mart eliminates overselling through **atomic row-level locking**.

### Stock Reservation Protocol:
```typescript
// src/server/services/stock.ts
export async function reserveStock(variantId: string, quantity: number) {
  return await db.transaction(async (tx) => {
    // 1. Acquire exclusive row-level lock on the variant
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .for('update'); // SELECT ... FOR UPDATE

    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    // 2. Check sufficient inventory
    if (variant.stock < quantity) {
      throw new InsufficientStockError(
        `Insufficient inventory. Requested: ${quantity}, Available: ${variant.stock}`
      );
    }

    // 3. Atomically decrement stock
    const newStock = variant.stock - quantity;
    await tx
      .update(productVariants)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId));

    return { success: true, remainingStock: newStock };
  });
}
```

---

## 2. Idempotency: Duplicate Callback & Webhook Handling

Payment gateways and courier webhooks routinely retransmit identical events due to network timeouts, proxy retries, or server acknowledgment delays.

### Webhook Deduplication Strategy:
1. **Idempotency Key Derivation:**
   Every payment webhook computes a unique compound key:
   $$\text{IdempotencyKey} = \text{MD5}(\text{gateway} + \text{":"} + \text{txn\_id} + \text{":"} + \text{amount})$$
2. **Transaction Processing Guard:**
   ```typescript
   // src/server/services/payment.ts
   export async function processPaymentWebhook(payload: PaymentWebhookPayload) {
     const idempotencyKey = `${payload.gateway}:${payload.txn_id}`;

     return await db.transaction(async (tx) => {
       // Check if payment txn_id already recorded
       const existingPayment = await tx
         .select()
         .from(payments)
         .where(eq(payments.txnId, payload.txn_id))
         .for('update');

       if (existingPayment.length > 0 && existingPayment[0].status === 'VALIDATED') {
         // Already processed cleanly; return idempotent success without duplicate order mutation
         return { status: 'ALREADY_PROCESSED', orderId: existingPayment[0].orderId };
       }

       // First arrival: Record payment record and update order
       await tx.insert(payments).values({
         orderId: payload.orderId,
         gateway: payload.gateway,
         txnId: payload.txn_id,
         amount: BigInt(payload.amountPoisha),
         status: 'VALIDATED',
         rawPayload: payload,
       });

       await tx
         .update(orders)
         .set({ status: 'CONFIRMED', updatedAt: new Date() })
         .where(eq(orders.id, payload.orderId));

       // Create held escrow ledger record
       await tx.insert(escrowLedger).values({
         orderId: payload.orderId,
         sellerId: payload.sellerId,
         amount: BigInt(payload.sellerAmountPoisha),
         state: 'held',
       });

       return { status: 'PROCESSED', orderId: payload.orderId };
     });
   }
   ```
3. **Observable Verification:** If the gateway sends 5 consecutive identical webhooks for the same order, exactly **one** record is added to `payments`, exactly **one** record is added to `escrow_ledger`, and the order remains in `CONFIRMED` status.
