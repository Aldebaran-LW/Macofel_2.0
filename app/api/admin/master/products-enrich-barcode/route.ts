import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import {
  applyBarcodeEnrichmentPatches,
  findProductsForBarcodeEnrichmentPreview,
  markEanEnrichmentCheckedForProducts,
  previewBarcodeEnrichmentForProduct,
  type BarcodeEnrichmentApplyItem,
  type EanEnrichmentBatchCatalog,
} from '@/lib/product-web-enrichment';

export const dynamic = 'force-dynamic';

const DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sanitizeApplyItem(raw: unknown): BarcodeEnrichmentApplyItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const productId = typeof o.productId === 'string' ? o.productId.trim() : '';
  if (!productId) return null;
  const patch: BarcodeEnrichmentApplyItem = { productId };
  if (typeof o.imageUrl === 'string' && o.imageUrl.trim()) patch.imageUrl = o.imageUrl.trim();
  if (Array.isArray(o.imageUrls)) {
    const urls = o.imageUrls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));
    if (urls.length) patch.imageUrls = urls;
  }
  if (typeof o.weight === 'number' && Number.isFinite(o.weight)) patch.weight = o.weight;
  if (typeof o.dimensionsCm === 'string' && o.dimensionsCm.trim()) {
    patch.dimensionsCm = o.dimensionsCm.trim();
  }
  const has =
    patch.imageUrl != null ||
    (patch.imageUrls?.length ?? 0) > 0 ||
    patch.weight != null ||
    patch.dimensionsCm != null;
  return has ? patch : null;
}

function parseCatalog(v: unknown): EanEnrichmentBatchCatalog {
  if (v === 'inactive' || v === 'all') return v;
  return 'active';
}

/**
 * POST (pré-visualização): limit (default 50, max 55), skip, onlyIfMissing, catalog: active|inactive|all (default active),
 *   skipAlreadyChecked (default true) — produtos já analisados no lote são ignorados; use skipAlreadyChecked: false para voltar a pesquisar todos.
 * POST (gravar): { apply: true, items: [...] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.apply === true) {
    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'items (array) é obrigatório ao gravar' }, { status: 400 });
    }
    if (rawItems.length > 70) {
      return NextResponse.json({ error: 'Máximo 70 itens por pedido' }, { status: 400 });
    }
    const items: BarcodeEnrichmentApplyItem[] = [];
    for (const r of rawItems) {
      const s = sanitizeApplyItem(r);
      if (s) items.push(s);
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item válido para gravar' }, { status: 400 });
    }
    const out = await applyBarcodeEnrichmentPatches(items);
    return NextResponse.json({
      applied: out.applied,
      failed: out.results.filter((x) => !x.ok).length,
      results: out.results,
    });
  }

  const limit = Math.min(55, Math.max(1, Number(body.limit) || 50));
  const skip = Math.max(0, Number(body.skip) || 0);
  const onlyIfMissing = body.onlyIfMissing !== false;
  const catalog = parseCatalog(body.catalog);
  const skipAlreadyChecked = body.skipAlreadyChecked !== false && body.includeRechecked !== true;

  const products = await findProductsForBarcodeEnrichmentPreview({
    limit,
    skip,
    onlyIfMissing,
    catalog,
    skipAlreadyChecked,
  });

  const rows: Awaited<ReturnType<typeof previewBarcodeEnrichmentForProduct>>[] = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    const digits = String(p.codBarra ?? '').replace(/\D/g, '');
    if (digits.length < 8) {
      rows.push({
        ok: false,
        canApply: false,
        productId: p.id,
        productName: p.name,
        codBarra: p.codBarra,
        reason: 'EAN inválido ou curto',
      });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const row = await previewBarcodeEnrichmentForProduct(p.id, p.name, p.codBarra);
    rows.push(row);

    if (i < products.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(DELAY_MS);
    }
  }

  const attemptedIds = products.map((p) => p.id);
  await markEanEnrichmentCheckedForProducts(attemptedIds);

  const withProposal = rows.filter((r) => r.canApply).length;

  return NextResponse.json({
    dryRun: true,
    processed: rows.length,
    withProposal,
    catalog,
    skipAlreadyChecked,
    limit,
    skip,
    results: rows.map((r) => ({
      id: r.productId,
      name: r.productName,
      codBarra: r.codBarra,
      canApply: r.canApply,
      reason: r.reason,
      source: r.source,
      resolvedTitle: r.resolvedTitle,
      matched_ean: r.matched_ean,
      patch: r.patch,
    })),
  });
}
