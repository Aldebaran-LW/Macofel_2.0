/**
 * Promove rascunho (`status: pending_review` na coleção products) para produto Prisma
 * (categoryId, subcategoria, status boolean, etc.) e remove o documento de rascunho.
 */

import { ObjectId } from 'mongodb';
import mongoPrisma from '@/lib/mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { resolveImportFallbackCategoryId } from '@/lib/import-fallback-category';
import {
  runProductCatalogImport,
  type ProductCatalogImportRow,
} from '@/lib/product-relatorio-import';

function numOr(
  v: unknown,
  fallback: number,
  mode: 'float' | 'int'
): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return mode === 'int' ? Math.trunc(v) : v;
  }
  const n =
    mode === 'int'
      ? parseInt(String(v ?? ''), 10)
      : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function normMarcaPromote(raw: unknown): string | null {
  const t = String(raw ?? '').trim();
  if (!t || t === '—' || t === '-') return null;
  return t;
}

export type PromoteDraftResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Lê o rascunho no Mongo nativo, grava/atualiza via `runProductCatalogImport` e apaga o rascunho.
 */
export async function promoteCatalogDraftById(
  draftId: string,
  _notes?: string
): Promise<PromoteDraftResult> {
  if (!draftId?.trim() || !ObjectId.isValid(draftId)) {
    return { ok: false, message: 'ID inválido' };
  }

  try {
    const db = await connectToDatabase();
    const col = db.collection('products');
    const draft = await col.findOne({ _id: new ObjectId(draftId) });

    if (!draft) {
      return { ok: false, message: 'Rascunho não encontrado' };
    }
    if (draft.status !== 'pending_review') {
      return { ok: false, message: 'Este item não está pendente de revisão' };
    }

    const name = String(draft.name ?? '').trim();
    if (!name) {
      return { ok: false, message: 'Rascunho sem nome' };
    }

    const macroSlug = String(
      draft.macroCategorySlug ?? draft.category ?? ''
    ).trim();
    let categoryId: string | null = null;
    if (macroSlug) {
      const c = await mongoPrisma.category.findUnique({
        where: { slug: macroSlug },
      });
      categoryId = c?.id ?? null;
    }
    if (!categoryId) {
      const fb = await resolveImportFallbackCategoryId(null);
      categoryId = fb?.id ?? null;
    }
    if (!categoryId) {
      return { ok: false, message: 'Não há categoria no sistema para associar o produto' };
    }

    const pricePrazoRaw = draft.pricePrazo;
    const pricePrazo =
      pricePrazoRaw != null && pricePrazoRaw !== ''
        ? numOr(pricePrazoRaw, NaN, 'float')
        : NaN;
    const pricePrazoFin =
      Number.isFinite(pricePrazo) && pricePrazo > 0 ? pricePrazo : null;

    const row: ProductCatalogImportRow = {
      code: String(draft.codigo ?? '').trim(),
      name,
      description: String(draft.description ?? '').trim() || name,
      price: numOr(draft.price, 0, 'float'),
      stock: numOr(draft.stock, 0, 'int'),
      subcategoria: String(draft.subcategoria ?? '').trim(),
      weight:
        typeof draft.weight === 'number' && draft.weight > 0
          ? draft.weight
          : null,
      cost:
        typeof draft.cost === 'number' && Number.isFinite(draft.cost)
          ? draft.cost
          : null,
      pricePrazo: pricePrazoFin,
      unidade: draft.unidade ? String(draft.unidade).trim() || null : null,
      codBarra: draft.codBarra
        ? String(draft.codBarra).replace(/\D/g, '') || null
        : null,
      status: true,
      marca: normMarcaPromote(draft.marca),
    };

    const result = await runProductCatalogImport([row], {
      upsert: true,
      categoryId,
      routeGrupoToMacroCategory: false,
    });

    if (result.errors.length > 0) {
      return {
        ok: false,
        message: result.errors.map((e) => e.message).join('; '),
      };
    }
    if (result.created === 0 && result.updated === 0) {
      return { ok: false, message: 'Importação não aplicada (skipped ou dados inválidos)' };
    }

    await col.deleteOne({ _id: new ObjectId(draftId) });
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
