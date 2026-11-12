import { z } from "zod";

/**
 * RFQ (Request for Quotation) line item schema.
 */
export const CreateRfqItemSchema = z.object({
  variantId: z.string().uuid().optional(),
  itemTitle: z.string().trim().min(3).max(255),
  requestedQuantity: z.number().int().min(1),
  unitOfMeasure: z.string().trim().min(1).max(20),
  targetUnitPricePaisa: z.number().int().min(0).optional(),
  specifications: z.string().max(2000).optional(),
});

/**
 * Buyer RFQ submission schema (multi-supplier broadcast or invitation).
 */
export const CreateRfqSchema = z.object({
  buyerBusinessId: z.string().uuid(),
  title: z.string().trim().min(5).max(255),
  categoryId: z.string().uuid(),
  targetDeliveryDate: z.string().optional(),
  deliveryAddressId: z.string().uuid(),
  paymentTermsRequested: z.string().max(50).optional(),
  targetSellerIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one supplier to request quotation"),
  expiresAt: z.string().datetime(),
  items: z.array(CreateRfqItemSchema).min(1, "At least one item is required"),
});

export type CreateRfqDto = z.infer<typeof CreateRfqSchema>;

/**
 * Supplier quotation submission schema.
 */
export const SubmitQuotationSchema = z.object({
  rfqRequestId: z.string().uuid(),
  sellerId: z.string().uuid(),
  validUntil: z.string().datetime(),
  paymentTermsOffered: z.string().min(3).max(50),
  leadTimeDays: z.number().int().min(1),
  estimatedDeliveryFeePaisa: z.number().int().min(0).default(0),
  sellerNotes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        rfqRequestItemId: z.string().uuid(),
        listingId: z.string().uuid().optional(),
        offeredQuantity: z.number().int().min(1),
        unitPricePaisa: z.number().int().min(1),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
});

export type SubmitQuotationDto = z.infer<typeof SubmitQuotationSchema>;
