import { connectToDatabase } from '@/lib/mongodb-native';
import { MAX_CATALOG_BATCH, GEMINI_API_KEY } from '@/env';
import { applyGeminiEnrichmentToCatalogDocument } from '@/lib/catalog-import-pipeline';

const DEFAULT_SHORT_LEN = 160;
const DEFAULT_MAX_MARK = 300;

/**
 * Marca produtos ativos (`status: true`) com descrição curta para `enrichmentStatus: pending`,
 * para serem processados por `enrichActiveCatalogPendingProducts`.
 */
export async function markActiveProductsForShortDescriptionEnrichment(options?: {
  shortDescriptionMaxLen?: number;
  maxToMark?: number;
}): Promise<{ marked: number }> {
  const shortDescriptionMaxLen =
    options?.shortDescriptionMaxLen ?? DEFAULT_SHORT_LEN;
  const maxToMark = Math.min(
    options?.maxToMark ?? DEFAULT_MAX_MARK,
    5000
  );

  const db = await connectToDatabase();
  const col = db.collection('products');

  const docs = await col
    .find({
      status: true,
      enrichmentStatus: { $nin: ['pending', 'running'] },
      $expr: {
        $lt: [
          { $strLenCP: { $toString: { $ifNull: ['$description', ''] } } },
          shortDescriptionMaxLen,
        ],
      },
    })
    .limit(maxToMark)
    .toArray();

  if (!docs.length) return { marked: 0 };

  const ids = docs.map((d) => d._id);
  const res = await col.updateMany(
    { _id: { $in: ids } },
    { $set: { enrichmentStatus: 'pending' } }
  );

  return { marked: res.modifiedCount };
}

/**
 * Marca até N produtos ativos (sem filtro de descrição). Use com cuidado.
 */
export async function markActiveProductsForEnrichmentAll(options?: {
  maxToMark?: number;
}): Promise<{ marked: number }> {
  const maxToMark = Math.min(options?.maxToMark ?? DEFAULT_MAX_MARK, 5000);

  const db = await connectToDatabase();
  const col = db.collection('products');

  const docs = await col
    .find({
      status: true,
      enrichmentStatus: { $nin: ['pending', 'running'] },
    })
    .limit(maxToMark)
    .toArray();

  if (!docs.length) return { marked: 0 };

  const ids = docs.map((d) => d._id);
  const res = await col.updateMany(
    { _id: { $in: ids } },
    { $set: { enrichmentStatus: 'pending' } }
  );

  return { marked: res.modifiedCount };
}

/**
 * Processa até `limit` produtos ativos com `enrichmentStatus: 'pending'` (fila genérica).
 * Reencadeia no próximo tick se o lote veio cheio (para não estourar timeout num único handler).
 */
export async function enrichActiveCatalogPendingProducts(options?: {
  limit?: number;
  /** Se true (padrão), agenda outro lote no mesmo Node (útil no admin). Cron GET deve usar false. */
  chain?: boolean;
}): Promise<{ processed: number; chained: boolean }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const limit = Math.min(
    Math.max(1, options?.limit ?? MAX_CATALOG_BATCH),
    MAX_CATALOG_BATCH
  );
  const allowChain = options?.chain !== false;

  const db = await connectToDatabase();
  const col = db.collection('products');

  const docs = await col
    .find({
      status: true,
      enrichmentStatus: 'pending',
    })
    .limit(limit)
    .toArray();

  for (const doc of docs) {
    await applyGeminiEnrichmentToCatalogDocument(col, doc);
  }

  const chained = allowChain && docs.length === limit;
  if (chained) {
    setImmediate(() => {
      enrichActiveCatalogPendingProducts({ limit, chain: true }).catch((e) =>
        console.error('[enrich-active-queue] continuação:', e)
      );
    });
  }

  return { processed: docs.length, chained };
}
