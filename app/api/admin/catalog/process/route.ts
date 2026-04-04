import { NextRequest, NextResponse } from 'next/server';
import { CATALOG_INTERNAL_SECRET } from '@/env';
import { processCatalogImportFromUrl } from '@/lib/catalog-import-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-catalog-secret');
  if (!CATALOG_INTERNAL_SECRET || secret !== CATALOG_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : '';
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId : undefined;

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'fileUrl e fileName são obrigatórios' },
        { status: 400 }
      );
    }

    void processCatalogImportFromUrl(fileUrl, fileName, userId).catch((err) =>
      console.error('[catalog-process] Erro background:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Processamento iniciado em background.',
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
