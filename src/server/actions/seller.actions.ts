'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import {
  CreateProductSchema,
  UpdateProductSchema,
  AdjustStockSchema,
} from '@/lib/validators/catalog';
import {
  getSellerByUserId,
  createProductDraft,
  updateProductDraft,
  submitProductForModeration,
  adjustVariantStock,
  SellerError,
} from '@/server/services/seller.service';

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; errorCode: string; errorMessage: string };

/**
 * Server Action for sellers to create a new product draft.
 */
export async function createProductDraftAction(
  rawInput: unknown
): Promise<ActionResponse<{ productId: string; slug: string }>> {
  try {
    const user = await requireRole(['seller']);
    const seller = await getSellerByUserId(user.id);
    if (!seller) {
      return {
        success: false,
        errorCode: 'SELLER_NOT_FOUND',
        errorMessage: 'Seller profile could not be found for your account.',
      };
    }

    const parsed = CreateProductSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid product input',
      };
    }

    const result = await createProductDraft(seller.id, user.id, parsed.data);
    revalidatePath('/seller/products');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof SellerError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to create product draft';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}

/**
 * Server Action for sellers to update a draft or returned product.
 */
export async function updateProductDraftAction(
  productId: string,
  rawInput: unknown
): Promise<ActionResponse<{ productId: string; status: string }>> {
  try {
    const user = await requireRole(['seller']);
    const seller = await getSellerByUserId(user.id);
    if (!seller) {
      return {
        success: false,
        errorCode: 'SELLER_NOT_FOUND',
        errorMessage: 'Seller profile could not be found for your account.',
      };
    }

    const parsed = UpdateProductSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid product input',
      };
    }

    const result = await updateProductDraft(seller.id, user.id, productId, parsed.data);
    revalidatePath('/seller/products');
    revalidatePath(`/seller/products/${productId}`);
    revalidatePath('/products');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof SellerError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}

/**
 * Server Action for sellers to submit a draft/returned product for moderation.
 */
export async function submitProductForModerationAction(
  productId: string
): Promise<ActionResponse<{ productId: string; status: string }>> {
  try {
    const user = await requireRole(['seller']);
    const seller = await getSellerByUserId(user.id);
    if (!seller) {
      return {
        success: false,
        errorCode: 'SELLER_NOT_FOUND',
        errorMessage: 'Seller profile could not be found for your account.',
      };
    }

    const result = await submitProductForModeration(seller.id, user.id, productId);
    revalidatePath('/seller/products');
    revalidatePath('/admin/moderation');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof SellerError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to submit product';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}

/**
 * Server Action for sellers to adjust inventory for an owned variant.
 */
export async function adjustVariantStockAction(
  rawInput: unknown
): Promise<ActionResponse<{ variantId: string; sku: string; previousStock: number; newStock: number; delta: number }>> {
  try {
    const user = await requireRole(['seller']);
    const seller = await getSellerByUserId(user.id);
    if (!seller) {
      return {
        success: false,
        errorCode: 'SELLER_NOT_FOUND',
        errorMessage: 'Seller profile could not be found for your account.',
      };
    }

    const parsed = AdjustStockSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid stock adjustment input',
      };
    }

    const result = await adjustVariantStock(
      seller.id,
      user.id,
      parsed.data.variantId,
      {
        stock: parsed.data.stock,
        delta: parsed.data.delta,
        expectedPreviousStock: parsed.data.expectedPreviousStock,
      },
      parsed.data.reason
    );

    revalidatePath('/seller/products');
    revalidatePath('/seller/inventory');
    revalidatePath('/products');
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof SellerError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to adjust stock';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}
