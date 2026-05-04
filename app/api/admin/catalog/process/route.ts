import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { CATALOG_INTERNAL_SECRET } from '@/env';
import { saveProductsForReviewFast } from '@/lib/catalog-pending-mongo';
import {
  enrichImportedProductsForBatch,
  processCatalogImportFromUrl,
} from '@/lib/catalog-import-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fileUrl?: string;
      fileName?: string;
      importType?: string;
      userId?: string;
    };
    const { fileUrl, fileName, importType = 'full-catalog' } = body;

    const session = await getServerSession(authOptions);
    const isAdmin = canAccessAdminCatalogSession((session?.user as { role?: string })?.role);
    const hasSecret =
      Boolean(CATALOG_INTERNAL_SECRET) &&
      request.headers.get('x-catalog-secret') === CATALOG_INTERNAL_SECRET;

    if (!isAdmin && !hasSecret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const url = typeof fileUrl === 'string' ? fileUrl.trim() : '';
    const name = typeof fileName === 'string' ? fileName.trim() : '';
    if (!url || !name) {
      return NextResponse.json({ error: 'fileUrl e fileName são obrigatórios' }, { status: 400 });
    }

    if (importType === 'full-catalog-with-background-enrich') {
      const result = await saveProductsForReviewFast(url, name);

      void enrichImportedProductsForBatch(result.importId).catch((err) =>
        console.error('[catalog-process] enrich-background', err)
      );

      return NextResponse.json({
        status: 'success',
        message:
          '✅ Importação rápida concluída! Enriquecimento IA iniciado em segundo plano.',
        importId: result.importId,
        processed: result.processed,
        success: true,
      });
    }

    const userId = hasSecret
      ? typeof body.userId === 'string'
        ? body.userId
        : undefined
      : (session?.user as { id?: string })?.id;

    void processCatalogImportFromUrl(url, name, userId).catch((err) =>
      console.error('[catalog-process] Erro background:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Processamento iniciado em background.',
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
