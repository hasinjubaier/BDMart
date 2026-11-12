import { z } from "zod";

/**
 * Cart Item additions: strictly segregated B2B vs B2C.
 */
export const AddConsumerCartItemSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

export type AddConsumerCartItemDto = z.infer<typeof AddConsumerCartItemSchema>;

export const AddBusinessCartItemSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().min(1),
  buyerBusinessId: z.string().uuid(),
});

export type AddBusinessCartItemDto = z.infer<typeof AddBusinessCartItemSchema>;

/**
 * Standard checkout submission schema.
 */
export const CheckoutOrderSchema = z.object({
  cartId: z.string().uuid(),
  orderType: z.enum(["B2B", "B2C"]),
  buyerBusinessId: z.string().uuid().optional(),
  deliveryAddressId: z.string().uuid(),
  paymentProvider: z.enum(["SSLCOMMERZ", "BKASH", "NAGAD", "COD"]),
  idempotencyKey: z.string().min(16),
  customerNotes: z.string().max(500).optional(),
});

export type CheckoutOrderDto = z.infer<typeof CheckoutOrderSchema>;

/**
 * Order summary contract.
 */
export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  orderType: "B2B" | "B2C";
  subtotalPaisa: number;
  deliveryFeePaisa: number;
  discountPaisa: number;
  totalAmountPaisa: number;
  totalAmountBdt: number;
  paymentStatus:
    | "PENDING"
    | "AUTHORIZED"
    | "PAID"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED"
    | "FAILED";
  orderStatus:
    "PLACED" | "PROCESSING" | "PARTIALLY_SHIPPED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}
