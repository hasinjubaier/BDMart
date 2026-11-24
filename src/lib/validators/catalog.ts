import { z } from 'zod';

export const ProductVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(128, 'SKU cannot exceed 128 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU may only contain letters, numbers, hyphens, and underscores'),
  attributes: z.record(z.unknown()).default({}),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  price: z.number().int().positive('Price must be greater than 0 poisha'),
});

export const PriceTierInputSchema = z.object({
  minQty: z.number().int().min(2, 'Minimum wholesale tier quantity must be at least 2'),
  unitPrice: z.number().int().positive('Tier unit price must be positive'),
});

export const CreateProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title cannot exceed 255 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description cannot exceed 10000 characters'),
  categoryId: z.string().uuid('Invalid category ID'),
  basePrice: z.number().int().positive('Base price must be greater than 0 poisha'),
  moq: z.number().int().min(1, 'MOQ must be at least 1').default(1),
  isB2bEnabled: z.boolean().default(false),
  images: z.array(z.string().min(1)).min(1, 'At least one product image is required'),
  variants: z
    .array(ProductVariantInputSchema)
    .min(1, 'At least one variant is required'),
  tiers: z.array(PriceTierInputSchema).optional(),
}).refine((data) => {
  // If B2B is enabled and tiers are provided, tiers must be sorted and priced lower than basePrice
  if (data.isB2bEnabled && data.tiers && data.tiers.length > 0) {
    const quantities = new Set<number>();
    for (const tier of data.tiers) {
      if (quantities.has(tier.minQty)) return false; // Duplicate minQty
      quantities.add(tier.minQty);
    }
  }
  return true;
}, {
  message: 'Wholesale price tiers must have unique minimum quantities',
});

export const UpdateProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title cannot exceed 255 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().uuid('Invalid category ID'),
  basePrice: z.number().int().positive('Base price must be greater than 0 poisha'),
  moq: z.number().int().min(1, 'MOQ must be at least 1').default(1),
  isB2bEnabled: z.boolean().default(false),
  images: z.array(z.string().min(1)).min(1, 'At least one product image is required'),
  variants: z
    .array(ProductVariantInputSchema)
    .min(1, 'At least one variant is required'),
  tiers: z.array(PriceTierInputSchema).optional(),
});

export const AdjustStockSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  stock: z.number().int().min(0, 'Stock cannot be negative').optional(),
  delta: z.number().int().optional(),
  expectedPreviousStock: z.number().int().min(0).optional(),
  reason: z
    .string()
    .min(3, 'Adjustment reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
}).refine((data) => data.stock !== undefined || data.delta !== undefined, {
  message: 'Either target stock or signed delta must be provided',
});

export const ModerationActionSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  action: z.enum(['publish', 'return']),
  reason: z.string().optional(),
}).refine((data) => {
  if (data.action === 'return' && (!data.reason || data.reason.trim().length < 3)) {
    return false;
  }
  return true;
}, {
  message: 'A detailed reason is required when returning a listing for corrections',
  path: ['reason'],
});

export const CatalogQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  seller: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'title_asc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;
export type CatalogQueryParams = z.infer<typeof CatalogQuerySchema>;
