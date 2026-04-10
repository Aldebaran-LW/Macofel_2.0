import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getBuscarProdutoInfo, getBuscarProdutoInfoByBarcode } from '@/lib/buscar-produto-service';
import type { BuscarProdutoResponse } from '@/lib/buscar-produto-types';
import { digitsOnlyGtin, normalizeValidGtin } from '@/lib/gtin-validate';

/** Valores a gravar em `products` após pré-visualização aprovada. */
export type BarcodeEnrichmentPatch = {
  imageUrl?: string;
  imageUrls?: string[];
  weight?: number;
  dimensionsCm?: string;
};

export type BarcodeEnrichmentPreviewRow = {
  ok: boolean;
  canApply: boolean;
  productId: string;
  productName: string;
  codBarra: string | null;
  source?: string;
  reason?: string;
  resolvedTitle?: string;
  matched_ean?: string | null;
  patch?: BarcodeEnrichmentPatch;
};

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

/**
 * Consulta APIs (EAN validado) e devolve o patch sem gravar — para pré-visualização no painel.
 */
export async function previewBarcodeEnrichmentForProduct(
  productId: string,
  productName: string,
  codBarra: string | null | undefined
): Promise<BarcodeEnrichmentPreviewRow> {
  const cod = codBarra ?? null;
  const eanRaw = String(codBarra ?? '').trim();
  if (!eanRaw) {
    return {
      ok: false,
      canApply: false,
      productId,
      productName,
      codBarra: cod,
      reason: 'Sem código de barras',
    };
  }

  let info: Awaited<ReturnType<typeof getBuscarProdutoInfoByBarcode>> = null;
  try {
    info = await getBuscarProdutoInfoByBarcode(eanRaw, productName);
  } catch {
    return {
      ok: false,
      canApply: false,
      productId,
      productName,
      codBarra: cod,
      reason: 'Erro ao consultar APIs',
    };
  }
  if (!info) {
    return {
      ok: false,
      canApply: false,
      productId,
      productName,
      codBarra: cod,
      reason: 'Nenhuma fonte validou o EAN',
    };
  }

  try {
    new ObjectId(productId);
  } catch {
    return {
      ok: false,
      canApply: false,
      productId,
      productName,
      codBarra: cod,
      reason: 'ID de produto inválido',
    };
  }

  const patch: BarcodeEnrichmentPatch = {};
  if (info.photos?.length) {
    patch.imageUrl = info.photos[0];
    patch.imageUrls = info.photos;
  }
  if (info.weight_grams != null) {
    patch.weight = Number((info.weight_grams / 1000).toFixed(3));
  }
  if (info.dimensions_cm) {
    patch.dimensionsCm = info.dimensions_cm;
  }

  const canApply = Object.keys(patch).length > 0;
  return {
    ok: true,
    canApply,
    productId,
    productName,
    codBarra: cod,
    source: info.source,
    reason: canApply ? undefined : 'Fonte sem fotos, peso nem dimensões',
    resolvedTitle: info.title,
    matched_ean: info.matched_ean ?? null,
    patch: canApply ? patch : undefined,
  };
}

function patchToSet(patch: BarcodeEnrichmentPatch): Record<string, unknown> | null {
  const $set: Record<string, unknown> = {};
  if (patch.imageUrl && String(patch.imageUrl).trim()) {
    $set.imageUrl = String(patch.imageUrl).trim();
  }
  if (Array.isArray(patch.imageUrls) && patch.imageUrls.length > 0) {
    $set.imageUrls = patch.imageUrls.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
  }
  if (patch.weight != null && Number.isFinite(patch.weight)) {
    $set.weight = patch.weight;
  }
  if (patch.dimensionsCm && String(patch.dimensionsCm).trim()) {
    $set.dimensionsCm = String(patch.dimensionsCm).trim();
  }
  return Object.keys($set).length ? $set : null;
}

/** Grava um patch já aprovado (ex.: após pré-visualização no Master). */
export async function applyBarcodeEnrichmentPatch(
  productId: string,
  patch: BarcodeEnrichmentPatch
): Promise<{ ok: boolean; fields: string[]; reason?: string }> {
  const $set = patchToSet(patch);
  if (!$set) {
    return { ok: false, fields: [], reason: 'Patch vazio ou inválido' };
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(productId);
  } catch {
    return { ok: false, fields: [], reason: 'ID inválido' };
  }

  try {
    const db = await connectToDatabase();
    const res = await db.collection('products').updateOne({ _id: oid }, { $set });
    if (res.matchedCount === 0) {
      return { ok: false, fields: [], reason: 'Produto não encontrado' };
    }
  } catch {
    return { ok: false, fields: [], reason: 'Erro ao gravar no MongoDB' };
  }

  return { ok: true, fields: Object.keys($set) };
}

export type BarcodeEnrichmentApplyItem = { productId: string } & BarcodeEnrichmentPatch;

export async function applyBarcodeEnrichmentPatches(
  items: BarcodeEnrichmentApplyItem[]
): Promise<{
  applied: number;
  results: Array<{ productId: string; ok: boolean; fields?: string[]; reason?: string }>;
}> {
  const results: Array<{ productId: string; ok: boolean; fields?: string[]; reason?: string }> = [];
  let applied = 0;
  for (const item of items) {
    const { productId, ...patch } = item;
    if (!productId) {
      results.push({ productId: String(productId), ok: false, reason: 'ID em falta' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const r = await applyBarcodeEnrichmentPatch(productId, patch);
    if (r.ok) applied += 1;
    results.push({
      productId,
      ok: r.ok,
      fields: r.fields,
      reason: r.reason,
    });
  }
  return { applied, results };
}

/**
 * Atualiza imagens, peso (kg) e dimensões com base em ML/Google+Gemini validados pelo EAN.
 * O nome do produto só orienta o modelo; o match exige o código de barras nas fontes.
 */
export async function enrichProductFromBarcodeMatch(
  productId: string,
  productName: string,
  codBarra: string | null | undefined
): Promise<{ ok: boolean; updated: boolean; fields: string[]; reason?: string; source?: string }> {
  const prev = await previewBarcodeEnrichmentForProduct(productId, productName, codBarra);
  if (!prev.canApply || !prev.patch) {
    return {
      ok: prev.ok,
      updated: false,
      fields: [],
      reason: prev.reason,
      source: prev.source,
    };
  }
  const w = await applyBarcodeEnrichmentPatch(productId, prev.patch);
  if (!w.ok) {
    return { ok: false, updated: false, fields: [], reason: w.reason, source: prev.source };
  }
  return { ok: true, updated: true, fields: w.fields, source: prev.source };
}

export type EanEnrichmentBatchCatalog = 'active' | 'inactive' | 'all';

/** Lista candidatos ao lote Master (Mongo nativo: `eanEnrichmentCheckedAt` pode ainda não existir no documento). */
export async function findProductsForBarcodeEnrichmentPreview(params: {
  limit: number;
  skip: number;
  onlyIfMissing: boolean;
  catalog: EanEnrichmentBatchCatalog;
  skipAlreadyChecked: boolean;
}): Promise<Array<{ id: string; name: string; codBarra: string | null }>> {
  const db = await connectToDatabase();
  const and: object[] = [
    {
      codBarra: { $exists: true, $type: 'string', $nin: [null, ''] },
    },
  ];

  // Filtra já no Mongo para evitar gastar APIs com códigos claramente inválidos.
  // Nota: validação final (checksum) ainda é feita na pré-visualização por `normalizeValidGtin`.
  and.push({ codBarra: { $regex: /^\d{8,14}$/ } });
  and.push({ $expr: { $in: [{ $strLenCP: '$codBarra' }, [8, 12, 13, 14]] } });

  if (params.onlyIfMissing) {
    and.push({
      $or: [
        { imageUrl: { $in: [null, ''] } },
        { imageUrl: { $exists: false } },
        { weight: null },
        { weight: { $exists: false } },
        { dimensionsCm: { $in: [null, ''] } },
        { dimensionsCm: { $exists: false } },
      ],
    });
  }

  if (params.catalog === 'active') {
    and.push({ status: true });
  } else if (params.catalog === 'inactive') {
    and.push({ status: false });
  }

  if (params.skipAlreadyChecked) {
    and.push({
      $or: [
        { eanEnrichmentCheckedAt: { $exists: false } },
        { eanEnrichmentCheckedAt: null },
      ],
    });
  }

  const filter = and.length === 1 ? and[0]! : { $and: and };

  const docs = await db
    .collection('products')
    .find(filter)
    .sort({ status: -1, updatedAt: 1 })
    .skip(params.skip)
    .limit(params.limit)
    .project({ name: 1, codBarra: 1 })
    .toArray();

  return docs
    .map((d) => {
      const raw = d.codBarra != null && String(d.codBarra).trim() !== '' ? String(d.codBarra).trim() : null;
      // Defesa extra: caso existam documentos antigos fora do filtro ideal (ou com dados inconsistentes).
      const valid = raw ? normalizeValidGtin(raw) : null;
      return {
        id: (d._id as ObjectId).toString(),
        name: String(d.name ?? ''),
        codBarra: valid ? valid : raw ? digitsOnlyGtin(raw) : null,
        _valid: Boolean(valid),
      };
    })
    .filter((x) => x._valid)
    .map(({ _valid, ...rest }) => rest);
}

/** Marca produtos como já passados pela pré-visualização do lote (evita repetir APIs no próximo lote). */
export async function markEanEnrichmentCheckedForProducts(productIds: string[]): Promise<void> {
  if (!productIds.length) return;
  const oids: ObjectId[] = [];
  for (const id of productIds) {
    try {
      oids.push(new ObjectId(id));
    } catch {
      /* inválido */
    }
  }
  if (!oids.length) return;
  const db = await connectToDatabase();
  await db.collection('products').updateMany(
    { _id: { $in: oids } },
    { $set: { eanEnrichmentCheckedAt: new Date() } }
  );
}
