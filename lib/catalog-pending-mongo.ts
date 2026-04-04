import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';

/** Alinhado a catalog-agent/tools/mongodb_tools.py — coleção products, revisão por string status. */
export async function saveProductsForReview(products: Record<string, unknown>[]): Promise<number> {
  if (!products.length) return 0;
  const db = await connectToDatabase();
  const col = db.collection('products');
  const now = new Date();
  const toInsert = products.map((p) => ({
    ...p,
    _id: new ObjectId(),
    status: 'pending_review',
    created_at: now,
    reviewed_at: null,
    review_status: 'pending',
    review_notes: null,
  }));
  const result = await col.insertMany(toInsert);
  return result.insertedCount;
}

export async function getPendingReviewProducts(limit = 100): Promise<Record<string, unknown>[]> {
  const db = await connectToDatabase();
  const col = db.collection('products');
  return col.find({ status: 'pending_review' }).limit(limit).toArray();
}

export async function approvePendingProduct(productId: string, notes = ''): Promise<boolean> {
  const db = await connectToDatabase();
  const col = db.collection('products');
  const result = await col.updateOne(
    { _id: new ObjectId(productId) },
    {
      $set: {
        status: 'active',
        reviewed_at: new Date(),
        review_status: 'approved',
        review_notes: notes,
      },
    }
  );
  return result.modifiedCount > 0;
}

export async function rejectPendingProduct(productId: string, notes: string): Promise<boolean> {
  const db = await connectToDatabase();
  const col = db.collection('products');
  const result = await col.updateOne(
    { _id: new ObjectId(productId) },
    {
      $set: {
        status: 'rejected',
        reviewed_at: new Date(),
        review_status: 'rejected',
        review_notes: notes,
      },
    }
  );
  return result.modifiedCount > 0;
}
