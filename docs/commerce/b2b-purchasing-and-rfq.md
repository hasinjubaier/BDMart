# B2B Purchasing and RFQ Specification

## 1. Wholesale Commercial Framework

BD Mart's B2B engine enables commercial sourcing for retail shops, institutional buyers, and corporate procurement departments directly from verified manufacturers and distributors.

### Core Distinctions from Retail (B2C):
| Commercial Aspect | Retail (B2C) | Wholesale (B2B) |
|---|---|---|
| **Buyer Authentication** | Any registered phone number / email | Verified Business (`businesses.verified_at != null`) |
| **Minimum Purchase** | 1 unit | Enforced Minimum Order Quantity (MOQ) |
| **Pricing Schedule** | Flat retail price | Volume-tiered price ladder (`price_tiers`) |
| **Custom Quotes** | Not available | Structured RFQ (Request for Quote) system |
| **Tax Documentation** | Standard customer receipt | Formatted Mushak 6.3 VAT Tax Invoice PDF |
| **Packaging Unit** | Single consumer unit (piece) | Master carton, pack size, or bulk crate |

---

## 2. Minimum Order Quantity (MOQ) Server Enforcement

Every wholesale purchase order must strictly satisfy the seller's configured MOQ:
- **Product Model:** `products.moq` defines the threshold unit count.
- **Validation Guard:**
  ```typescript
  export async function validateB2BOrderLine(variantId: string, quantity: number, userRole: string) {
    if (userRole !== 'business_buyer') {
      throw new AuthorizationError('Wholesale ordering restricted to verified business buyers.');
    }
    const product = await getProductByVariantId(variantId);
    if (!product.is_b2b_enabled) {
      throw new BusinessLogicError('Selected product is not eligible for wholesale purchasing.');
    }
    if (quantity < product.moq) {
      throw new ValidationError(
        `Quantity (${quantity}) does not meet the Minimum Order Quantity (${product.moq}) for this item.`
      );
    }
    const unitPricePoisha = calculateTierPrice(product.id, quantity);
    return { unitPricePoisha, product };
  }
  ```

---

## 3. RFQ (Request for Quotation) Lifecycle

When standard catalog volume tiers do not meet an enterprise buyer's volume, custom branding, or delivery requirements, the buyer initiates a formal RFQ.

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Business Buyer
    participant RFQEngine as RFQ Service
    actor Seller as Qualified Sellers
    participant Escrow as Escrow System
    actor Admin as Platform Admin

    Buyer->>RFQEngine: Create RFQ (Item, Specs, Qty: 2000, Target: ৳150, Expires)
    RFQEngine->>Seller: Notify matching verified category sellers
    Seller->>RFQEngine: Submit Binding Quote (Unit Price: ৳145, Lead: 14 days)
    Buyer->>RFQEngine: Reviews competing quotes side-by-side
    Buyer->>RFQEngine: Accepts Quote #Q-981
    RFQEngine->>RFQEngine: Auto-generate B2B Order & Proforma Invoice
    Buyer->>Escrow: Deposit payment into Escrow (state: HELD)
    RFQEngine->>Seller: Order confirmed; begin production & dispatch
```

### RFQ State Machine:
- **`DRAFT`:** Buyer drafting specification and packaging requirements.
- **`OPEN`:** Published to verified category sellers; accepting quotes until `expires_at`.
- **`UNDER_EVALUATION`:** Bidding closed; buyer reviewing submitted quotes.
- **`ACCEPTED`:** Buyer selected winning quote; order automatically created in `orders` table.
- **`EXPIRED`:** Expiration date reached without quote acceptance.
- **`CANCELLED`:** Buyer cancelled RFQ before accepting a quote.

---

## 4. Automated VAT Invoice Generation (Mushak 6.3)

Verified B2B transactions require compliant commercial tax invoices under Bangladesh Value Added Tax and Supplementary Duty Act:
- **Generated Format:** PDF document generated server-side using React-PDF / headless PDF renderer.
- **Required Metadata Included on Invoice:**
  1. BD Mart Platform Registration & Master Intermediary BIN.
  2. Seller Registered Legal Business Name, Trade License Number, and BIN.
  3. Buyer Registered Corporate Entity Name, Address, and BIN.
  4. Unique Sequential Invoice Number (`INV-YYYY-XXXXXX`).
  5. Harmonized System (HS) Code / Category reference.
  6. Quantity, Unit of Sale (Pieces, Cartons, Kg).
  7. Value excluding VAT (in poisha and formatted BDT).
  8. Applicable VAT percentage (15%) and calculated VAT amount.
  9. Total Payable Amount with spelled-out Taka words in Bengali and English.
