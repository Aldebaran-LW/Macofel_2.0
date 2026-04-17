import { connectToDatabase } from '@/lib/mongodb-native';
import { MAX_CATALOG_BATCH, GEMINI_API_KEY } from '@/env';
import { applyGeminiEnrichmentToCatalogDocument } from '@/lib/catalog-import-pipeline';
import { normalizeValidGtin } from '@/lib/gtin-validate';

const DEFAULT_SHORT_LEN = 160;
const DEFAULT_MAX_MARK = 300;
const SCAN_CAP = 800;

/**
 * Marca produtos ativos (`status: true`) com descrição curta para `enrichmentStatus: pending`,
 * para serem processados por `enrichActiveCatalogPendingProducts`.
 * Por defeito só entram produtos com EAN/GTIN válido (checksum) em `codBarra`.
 */
export async function markActiveProductsForShortDescriptionEnrichment(options?: {
  shortDescriptionMaxLen?: number;
  maxToMark?: number;
  /** Se true (padrão), exige `codBarra` com GTIN válido. */
  requireValidBarcode?: boolean;
}): Promise<{ marked: number }> {
  const shortDescriptionMaxLen =
    options?.shortDescriptionMaxLen ?? DEFAULT_SHORT_LEN;
  const maxToMark = Math.min(
    options?.maxToMark ?? DEFAULT_MAX_MARK,
    5000
  );
  const requireValidBarcode = options?.requireValidBarcode !== false;

  const db = await connectToDatabase();
  const col = db.collection('products');

  const baseFilter: Record<string, unknown> = {
    status: true,
    enrichmentStatus: { $nin: ['pending', 'running', 'done'] },
    $expr: {
      $lt: [
        { $strLenCP: { $toString: { $ifNull: ['$description', ''] } } },
        shortDescriptionMaxLen,
      ],
    },
  };
  if (requireValidBarcode) {
    baseFilter.codBarra = { $exists: true, $nin: [null, ''] };
  }

  const scan = await col
    .find(baseFilter)
    .limit(requireValidBarcode ? SCAN_CAP : maxToMark)
    .toArray();

  const docs = requireValidBarcode
    ? scan.filter((d) => normalizeValidGtin(d.codBarra) != null).slice(0, maxToMark)
    : scan;

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
 * Por defeito só com GTIN válido em `codBarra`.
 */
export async function markActiveProductsForEnrichmentAll(options?: {
  maxToMark?: number;
  requireValidBarcode?: boolean;
}): Promise<{ marked: number }> {
  const maxToMark = Math.min(options?.maxToMark ?? DEFAULT_MAX_MARK, 5000);
  const requireValidBarcode = options?.requireValidBarcode !== false;

  const db = await connectToDatabase();
  const col = db.collection('products');

  const filter: Record<string, unknown> = {
    status: true,
    enrichmentStatus: { $nin: ['pending', 'running', 'done'] },
  };
  if (requireValidBarcode) {
    filter.codBarra = { $exists: true, $nin: [null, ''] };
  }

  const scan = await col
    .find(filter)
    .limit(requireValidBarcode ? SCAN_CAP : maxToMark)
    .toArray();

  const docs = requireValidBarcode
    ? scan.filter((d) => normalizeValidGtin(d.codBarra) != null).slice(0, maxToMark)
    : scan;

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
    if (normalizeValidGtin(doc.codBarra) == null) {
      await col.updateOne(
        { _id: doc._id },
        {
          $set: {
            enrichmentStatus: 'skipped',
            enrichment_notes:
              'Fila: removido — sem EAN válido (checksum GS1). Corrija o campo codBarra ou use apenas produtos com GTIN válido na fila.',
            ean_web_match: 'invalid_checksum',
            updatedAt: new Date(),
          },
        }
      );
      continue;
    }
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
