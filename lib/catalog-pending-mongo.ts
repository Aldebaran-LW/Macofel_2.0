import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { MAX_CATALOG_BATCH } from '@/env';
import { parseCatalogSourceToRows, cleanImportRow } from '@/lib/catalog-import-pipeline';
import { promoteCatalogDraftById } from '@/lib/catalog-draft-promote';

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

function codigoFromRow(row: Record<string, unknown>): string {
  return String(row.codigo ?? row.Codigo ?? '').trim();
}

/**
 * Importação rápida: grava linhas já normalizadas pelos parsers do catálogo, sem Gemini.
 * O enriquecimento corre em background (`enrichImportedProductsForBatch`).
 * Se `codigo` já existir (índice único): atualiza em vez de inserir — produtos ativos (`status: true`)
 * recebem dados do relatório e `enrichmentStatus: pending` para IA em lote; inativos só preço/estoque.
 */
export async function saveProductsForReviewFast(fileUrl: string, fileName: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(fileUrl, { headers });
  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo (${res.status})`);
  }

  const ab = await res.arrayBuffer();
  let rawRowsUnknown = await parseCatalogSourceToRows(ab, fileName);
  let rawRows = rawRowsUnknown.filter(
    (r): r is Record<string, unknown> =>
      Boolean(r) && typeof r === 'object' && !Array.isArray(r)
  );
  rawRows = rawRows.slice(0, MAX_CATALOG_BATCH);

  const lastByCodigo = new Map<string, Record<string, unknown>>();
  const noCodeRows: Record<string, unknown>[] = [];
  for (const row of rawRows) {
    const c = codigoFromRow(row);
    if (c) lastByCodigo.set(c, row);
    else noCodeRows.push(row);
  }
  rawRows = [...lastByCodigo.values(), ...noCodeRows];

  if (rawRows.length === 0) {
    throw new Error('Nenhuma linha válida para importar');
  }

  const importId = `import-${Date.now()}`;
  const now = new Date();
  const db = await connectToDatabase();
  const col = db.collection('products');

  const codigos = Array.from(
    new Set(rawRows.map(codigoFromRow).filter((c) => c.length > 0))
  );
  const existing =
    codigos.length > 0
      ? await col.find({ codigo: { $in: codigos } }).toArray()
      : [];
  const byCodigo = new Map<string, (typeof existing)[0]>();
  for (const doc of existing) {
    const c = String(doc.codigo ?? '').trim();
    if (c) byCodigo.set(c, doc);
  }

  const toInsert: Record<string, unknown>[] = [];
  let updatedForEnrich = 0;
  let updatedInactiveOnly = 0;

  for (const row of rawRows) {
    const c = codigoFromRow(row);
    const ex = c ? byCodigo.get(c) : undefined;
    const normalized = cleanImportRow(row);

    if (ex) {
      const exStatus = ex.status;

      if (typeof exStatus === 'boolean' && exStatus === true) {
        await col.updateOne(
          { _id: ex._id },
          {
            $set: {
              name: normalized.name || String(ex.name ?? ''),
              price: normalized.price,
              pricePrazo: normalized.pricePrazo,
              stock: normalized.stock,
              marca: normalized.marca || ex.marca,
              description:
                normalized.description || String(ex.description ?? '').trim() || normalized.name,
              subcategoria: normalized.category
                ? normalized.category
                : (ex.subcategoria as string | undefined),
              enrichmentStatus: 'pending',
              catalog_import_batch_id: importId,
              importDate: now,
              sourceFile: fileName,
              catalog_import_source_url: fileUrl,
              catalog_import_file_name: fileName,
              updatedAt: now,
            },
          }
        );
        updatedForEnrich++;
        continue;
      }

      if (exStatus === 'imported' || exStatus === 'pending_review') {
        await col.updateOne(
          { _id: ex._id },
          {
            $set: {
              ...row,
              name: normalized.name,
              codigo: normalized.codigo || c,
              description: normalized.description,
              price: normalized.price,
              pricePrazo: normalized.pricePrazo,
              stock: normalized.stock,
              marca: normalized.marca,
              slug: normalized.slug,
              category: normalized.category,
              status: 'imported',
              enrichmentStatus: 'pending',
              catalog_import_batch_id: importId,
              importDate: now,
              sourceFile: fileName,
              catalog_import_source_url: fileUrl,
              catalog_import_file_name: fileName,
              created_at: (ex as { created_at?: Date }).created_at ?? now,
              reviewed_at: null,
              review_status: 'pending',
              review_notes: null,
              updatedAt: now,
            },
          }
        );
        updatedForEnrich++;
        continue;
      }

      if (typeof exStatus === 'boolean' && exStatus === false) {
        await col.updateOne(
          { _id: ex._id },
          {
            $set: {
              price: normalized.price,
              pricePrazo: normalized.pricePrazo,
              stock: normalized.stock,
              updatedAt: now,
            },
          }
        );
        updatedInactiveOnly++;
        continue;
      }

      continue;
    }

    if (!c) {
      continue;
    }

    toInsert.push({
      ...row,
      _id: new ObjectId(),
      status: 'imported',
      enrichmentStatus: 'pending',
      importDate: now,
      sourceFile: fileName,
      catalog_import_batch_id: importId,
      catalog_import_source_url: fileUrl,
      catalog_import_file_name: fileName,
      created_at: now,
      reviewed_at: null,
      review_status: 'pending',
      review_notes: null,
    });
  }

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const result = await col.insertMany(toInsert);
    insertedCount = result.insertedCount;
  }

  const processed = insertedCount + updatedForEnrich + updatedInactiveOnly;
  if (processed === 0) {
    throw new Error('Nenhuma linha aplicada (códigos vazios ou já rejeitados).');
  }

  return {
    importId,
    processed,
    inserted: insertedCount,
    updatedExisting: updatedForEnrich + updatedInactiveOnly,
    pending_review: processed,
  };
}

export async function getPendingReviewProducts(limit = 100): Promise<Record<string, unknown>[]> {
  const db = await connectToDatabase();
  const col = db.collection('products');
  return col
    .find({
      $or: [
        { status: 'pending_review' },
        {
          status: 'imported',
          enrichmentStatus: { $in: ['pending', 'running', 'failed'] },
        },
        {
          status: true,
          enrichmentStatus: { $in: ['pending', 'running', 'failed'] },
        },
      ],
    })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

export async function approvePendingProduct(productId: string, notes = ''): Promise<boolean> {
  const r = await promoteCatalogDraftById(productId, notes);
  return r.ok;
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
