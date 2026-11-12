import { z } from "zod";

/**
 * Category response contract.
 */
export interface CategoryDto {
  id: string;
  parentId: string | null;
  nameEn: string;
  nameBn: string;
  slug: string;
  level: number;
  commissionRatePercent: number;
  isActive: boolean;
  children?: CategoryDto[];
}

/**
 * Product variant contract.
 */
export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, string | number>;
  weightGrams: number | null;
  unitOfMeasure: string;
}

/**
 * Wholesale price tier contract.
 */
export interface WholesalePriceTierDto {
  id: string;
  listingId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPricePaisa: number;
  unitPriceBdt: number;
}

/**
 * Seller listing summary (Single Source of Truth for Pricing).
 */
export interface SellerListingDto {
  id: string;
  sellerId: string;
  sellerStoreName: string;
  variantId: string;
  sellerSku: string;
  retailPricePaisa: number | null; // B2C price
  retailPriceBdt: number | null;
  minimumOrderQuantity: number; // B2B MOQ
  packMultiple: number;
  leadTimeDays: number;
  isB2bActive: boolean;
  isB2cActive: boolean;
  status: "ACTIVE" | "OUT_OF_STOCK" | "INACTIVE";
  wholesaleTiers?: WholesalePriceTierDto[];
}
