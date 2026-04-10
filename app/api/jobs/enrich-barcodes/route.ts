import { NextRequest, NextResponse } from 'next/server';
import {
  applyBarcodeEnrichmentPatches,
  findProductsForBarcodeEnrichmentPreview,
  markEanEnrichmentCheckedForProducts,
  previewBarcodeEnrichmentForProduct,
  type BarcodeEnrichmentApplyItem,
} from '@/lib/product-web-enrichment';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 55;
const DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function hasValidJobAuth(req: NextRequest): boolean {
  const token = process.env.JOBS_API_TOKEN;
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return m[1] === token;
}

function toBool(v: unknown, defaultValue: boolean): boolean {
  if (v === true) return true;
  if (v === false) return false;
  return defaultValue;
}

/**
 * Job server-to-server para enriquecer produtos por EAN/GTIN.
 *
 * POST body (opcional):
 * - limit: number (default 20, max 55)
 * - dryRun: boolean (default false)
 * - onlyIfMissing: boolean (default true)
 * - skipAlreadyChecked: boolean (default true)
 *
 * Auth:
 * - Authorization: Bearer ${JOBS_API_TOKEN}
 */
export async function POST(req: NextRequest) {
  if (!hasValidJobAuth(req)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));
  const dryRun = toBool(body.dryRun, false);
  const onlyIfMissing = toBool(body.onlyIfMissing, true);
  const skipAlreadyChecked = toBool(body.skipAlreadyChecked, true);

  const products = await findProductsForBarcodeEnrichmentPreview({
    limit,
    skip: 0,
    onlyIfMissing,
    catalog: 'active',
    skipAlreadyChecked,
  });

  const attemptedIds = products.map((p) => p.id);
  const proposals: BarcodeEnrichmentApplyItem[] = [];
  const previewResults: Array<Awaited<ReturnType<typeof previewBarcodeEnrichmentForProduct>>> = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    // eslint-disable-next-line no-await-in-loop
    const row = await previewBarcodeEnrichmentForProduct(p.id, p.name, p.codBarra);
    previewResults.push(row);
    if (row.canApply && row.patch) {
      proposals.push({ productId: p.id, ...row.patch });
    }

    if (i < products.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(DELAY_MS);
    }
  }

  await markEanEnrichmentCheckedForProducts(attemptedIds);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      processed: previewResults.length,
      withProposal: proposals.length,
      results: previewResults.map((r) => ({
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

  const applied = proposals.length ? await applyBarcodeEnrichmentPatches(proposals) : null;

  return NextResponse.json({
    ok: true,
    dryRun: false,
    processed: previewResults.length,
    proposed: proposals.length,
    applied: applied?.applied ?? 0,
    failed: applied ? applied.results.filter((x) => !x.ok).length : 0,
    results: applied?.results ?? [],
  });
}

