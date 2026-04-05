import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { CATALOG_INTERNAL_SECRET } from '@/env';
import { enrichImportedProductsForBatch } from '@/lib/catalog-import-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminDashboardRole((session?.user as { role?: string })?.role);
    const hasSecret =
      Boolean(CATALOG_INTERNAL_SECRET) &&
      request.headers.get('x-catalog-secret') === CATALOG_INTERNAL_SECRET;

    if (!isAdmin && !hasSecret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { importId } = (await request.json()) as { importId?: string };
    if (!importId?.trim()) {
      return NextResponse.json({ error: 'importId obrigatório' }, { status: 400 });
    }

    console.log(`[Background] Iniciando enriquecimento para import ${importId}`);

    void enrichImportedProductsForBatch(importId).catch((err) =>
      console.error('[enrich-background]', err)
    );

    return NextResponse.json({ status: 'enrichment_started', importId });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
