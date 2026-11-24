'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import {
  publishProduct,
  returnProduct,
  ModerationError,
} from '@/server/services/moderation.service';
import type { ActionResponse } from './seller.actions';

/**
 * Server Action for admins to publish a product listing.
 */
export async function publishProductAction(
  productId: string
): Promise<ActionResponse<{ productId: string; status: string }>> {
  try {
    const user = await requireRole(['admin']);
    const result = await publishProduct(user.id, productId);

    revalidatePath('/admin/moderation');
    revalidatePath('/products');
    revalidatePath(`/seller/products/${productId}`);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ModerationError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to publish listing';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}

/**
 * Server Action for admins to return a product listing with a reason.
 */
export async function returnProductAction(
  productId: string,
  reason: string
): Promise<ActionResponse<{ productId: string; status: string }>> {
  try {
    const user = await requireRole(['admin']);
    const result = await returnProduct(user.id, productId, reason);

    revalidatePath('/admin/moderation');
    revalidatePath('/seller/products');
    revalidatePath(`/seller/products/${productId}`);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ModerationError) {
      return { success: false, errorCode: error.code, errorMessage: error.message };
    }
    const message = error instanceof Error ? error.message : 'Failed to return listing';
    return { success: false, errorCode: 'INTERNAL_ERROR', errorMessage: message };
  }
}
