import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import { extractPdfTextLines } from '@/lib/relatorio-produtos-pdf';
import { importFileTooLarge, MAX_IMPORT_FILE_DESC } from '@/lib/import-upload-limits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canAccessPhysicalStockApi((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o ficheiro no campo file' }, { status: 400 });
    }

    if (importFileTooLarge(file)) {
      return NextResponse.json(
        { error: `PDF demasiado grande (máx. ${MAX_IMPORT_FILE_DESC})` },
        { status: 400 }
      );
    }

    const buf = await file.arrayBuffer();
    const { lines } = await extractPdfTextLines(buf);
    const text = lines.join('\n');

    return NextResponse.json({ text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('extract-pdf-text:', e);
    return NextResponse.json(
      { error: 'Erro ao ler o PDF', details: message },
      { status: 500 }
    );
  }
}
