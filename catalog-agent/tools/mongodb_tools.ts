/**
 * Adaptador Node/Next.js com a mesma API nominal do mongodb_tools.py (Python).
 * O runtime Python continua em mongodb_tools.py; o Next importa este arquivo.
 */

import { ObjectId } from 'mongodb';
import {
  approvePendingProduct,
  getPendingReviewProducts,
  rejectPendingProduct,
  saveProductsForReview,
} from '@/lib/catalog-pending-mongo';

export async function save_products_for_review(products: Record<string, unknown>[]): Promise<number> {
  return saveProductsForReview(products);
}

export async function get_pending_review_products(limit = 100): Promise<Record<string, unknown>[]> {
  const rows = await getPendingReviewProducts(limit);
  return rows.map((doc) => {
    const { _id, ...rest } = doc as { _id: ObjectId };
    return { ...rest, _id: _id.toString() };
  });
}

export async function approve_product(product_id: string, notes: string): Promise<boolean> {
  return approvePendingProduct(product_id, notes);
}

export async function reject_product(product_id: string, notes: string): Promise<boolean> {
  return rejectPendingProduct(product_id, notes);
}
