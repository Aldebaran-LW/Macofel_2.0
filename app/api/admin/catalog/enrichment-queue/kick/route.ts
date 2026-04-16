import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import {
  enrichActiveCatalogPendingProducts,
  markActiveProductsForShortDescriptionEnrichment,
} from '@/lib/catalog-active-enrich-queue';
import { GEMINI_API_KEY } from '@/env';

export const dynamic = 'force-dynamic';

/**
 * Após importações de estoque: marca produtos ativos com EAN válido e descrição curta
 * para `enrichmentStatus: pending` e arranca o processamento em segundo plano.
 * Os resultados aparecem em Estoque → Pendentes (IA).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const marked = await markActiveProductsForShortDescriptionEnrichment({
      maxToMark: 300,
      requireValidBarcode: true,
    });

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        ok: true,
        marked: marked.marked,
        enrichmentQueued: false,
        warning: 'GEMINI_API_KEY não configurada — produtos ficaram na fila pending até haver chave ou cron.',
      });
    }

    setImmediate(() => {
      enrichActiveCatalogPendingProducts({ chain: true }).catch((e) =>
        console.error('[enrichment-queue/kick]', e)
      );
    });

    return NextResponse.json({
      ok: true,
      marked: marked.marked,
      enrichmentQueued: true,
      message:
        'Fila de enriquecimento (IA) iniciada em segundo plano para produtos ativos com código de barras válido.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[enrichment-queue/kick]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
