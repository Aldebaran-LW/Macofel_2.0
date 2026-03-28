import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';
import type { BuscarProdutoResponse } from '@/lib/buscar-produto-types';

/** Campos extra no documento Mongo (Prisma pode estar desatualizado no client gerado). */
export async function applyExtraFieldsFromEnrichment(
  productId: string,
  enriched: BuscarProdutoResponse | null
): Promise<void> {
  if (!enriched) return;
  const set: Record<string, unknown> = {};
  if (enriched.dimensions_cm) set.dimensionsCm = enriched.dimensions_cm;
  if (enriched.photos?.length) set.imageUrls = enriched.photos;
  if (Object.keys(set).length === 0) return;
  try {
    const db = await connectToDatabase();
    await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: set });
  } catch {
    // não bloqueia criação/edição principal
  }
}

/**
 * Preenche peso, imagem principal, dimensões e lista de imagens só onde estiver vazio.
 * Usa Mongo nativo para não depender do client Prisma ter todos os campos.
 */
export async function enrichExistingProductIfSparse(
  productId: string,
  productName: string
): Promise<{ updated: boolean; fields: string[] }> {
  const name = productName.trim();
  if (!name) return { updated: false, fields: [] };

  let oid: ObjectId;
  try {
    oid = new ObjectId(productId);
  } catch {
    return { updated: false, fields: [] };
  }

  const db = await connectToDatabase();
  const doc = await db.collection('products').findOne(
    { _id: oid },
    { projection: { weight: 1, imageUrl: 1, dimensionsCm: 1, imageUrls: 1 } }
  );
  if (!doc) return { updated: false, fields: [] };

  const needWeight = doc.weight == null;
  const needImg = !doc.imageUrl || !String(doc.imageUrl).trim();
  const needDim = !doc.dimensionsCm || !String(doc.dimensionsCm).trim();
  const needUrls = !Array.isArray(doc.imageUrls) || doc.imageUrls.length === 0;

  if (!needWeight && !needImg && !needDim && !needUrls) {
    return { updated: false, fields: [] };
  }

  let info: BuscarProdutoResponse | null = null;
  try {
    info = await getBuscarProdutoInfo(name);
  } catch {
    return { updated: false, fields: [] };
  }
  if (!info) return { updated: false, fields: [] };

  const $set: Record<string, unknown> = {};
  if (needWeight && info.weight_grams != null) {
    $set.weight = Number((info.weight_grams / 1000).toFixed(3));
  }
  if (needImg && info.photos?.[0]) {
    $set.imageUrl = info.photos[0];
  }
  if (needDim && info.dimensions_cm) {
    $set.dimensionsCm = info.dimensions_cm;
  }
  if (needUrls && info.photos?.length) {
    $set.imageUrls = info.photos;
  }

  const fields = Object.keys($set);
  if (fields.length === 0) return { updated: false, fields: [] };

  await db.collection('products').updateOne({ _id: oid }, { $set });
  return { updated: true, fields };
}
