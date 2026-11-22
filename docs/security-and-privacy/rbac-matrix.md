# Role-Based Access Control (RBAC) Matrix

## 1. Actor Roles & Permission Grid

BD Mart enforces strict server-side authorization. Hiding buttons in the UI is never treated as a security control; every Server Action and Route Handler executes `requireRole()` and validates ownership.

| Action / Resource | Guest | `buyer` | `business_buyer` | `seller` | `admin` | Enforcement Method |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **View Catalog & Retail Prices** | ✅ | ✅ | ✅ | ✅ | ✅ | Public Read / SSR |
| **View B2B Wholesale Tiers & MOQ** | ❌ | ❌ | ✅ | ✅ (Own items) | ✅ | Server-side role check in API / RSC |
| **Add to Cart & Calculate Upfront Delivery** | ✅ | ✅ | ✅ | ❌ | ❌ | Client state / Session |
| **Submit Retail Order (B2C)** | ❌ (Prompts Login) | ✅ | ✅ | ❌ | ❌ | `requireRole(['buyer', 'business_buyer'])` |
| **Submit Wholesale Bulk Order (B2B)** | ❌ | ❌ | ✅ | ❌ | ❌ | `requireRole(['business_buyer'])` + MOQ check |
| **Create RFQ** | ❌ | ❌ | ✅ | ❌ | ❌ | `requireRole(['business_buyer'])` |
| **Submit Quote to RFQ** | ❌ | ❌ | ❌ | ✅ | ❌ | `requireRole(['seller'])` with approved KYC |
| **View Own Orders & Invoices** | ❌ | ✅ (Own) | ✅ (Company) | ✅ (Own Sales) | ✅ (All) | Ownership filter (`buyer_id` / `seller_id`) |
| **Manage Catalog & Stock (CRUD)** | ❌ | ❌ | ❌ | ✅ (Own Items) | ✅ (Moderation) | `requireRole(['seller'])` + `product.seller_id == user.seller_id` |
| **Request Courier Pickup** | ❌ | ❌ | ❌ | ✅ (Own Orders) | ❌ | `requireRole(['seller'])` |
| **Approve / Reject Seller KYC** | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole(['admin'])` |
| **Arbitrate Disputes (Release/Refund)**| ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole(['admin'])` |
| **View System Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole(['admin'])` |

---

## 2. Resource Ownership & Horizontal Access Control

To prevent Insecure Direct Object References (IDOR):
- **Seller Isolation Invariant:** A seller calling `updateProduct(id, data)` or `fetchOrderDetails(orderId)` must be verified:
  ```typescript
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, currentSeller.id)));
  if (!product) {
    throw new ForbiddenError('You do not own this product.');
  }
  ```
- **Business Buyer Isolation Invariant:** Company A cannot see quotes, pricing negotiations, or purchase orders submitted by Company B. All B2B queries scope strictly to `businesses.id = currentBusinessBuyer.businessId`.
