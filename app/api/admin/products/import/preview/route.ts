import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { importRowSlug, parseRelatorioEstoqueWorkbook } from '@/lib/relatorio-estoque-xls';

export const dynamic = 'force-dynamic';

const MAX_PREVIEW = 40;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o ficheiro no campo file' }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const { rows, warnings } = parseRelatorioEstoqueWorkbook(buf);

    const sample = rows.slice(0, MAX_PREVIEW).map((r) => ({
      code: r.code,
      name: r.name,
      grupo: r.grupo,
      marca: r.marca,
      stock: r.stock,
      price: r.price,
      vlVenda: r.vlVenda,
      vlCusto: r.vlCusto,
      slug: importRowSlug(r.code, r.name),
      sheet: r.sheetName,
      row: r.rowIndex,
    }));

    return NextResponse.json({
      totalRows: rows.length,
      previewCount: sample.length,
      sample,
      warnings,
    });
  } catch (e: any) {
    console.error('preview import produtos:', e);
    return NextResponse.json(
      { error: 'Erro ao ler o ficheiro', details: e?.message },
      { status: 500 }
    );
  }
}
