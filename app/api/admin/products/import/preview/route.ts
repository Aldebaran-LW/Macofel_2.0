import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import {
  isWordLikeCatalogFile,
  parseRelatorioEstoqueWordLike,
} from '@/lib/relatorio-estoque-doc-word';
import { importRowSlug, parseRelatorioEstoqueWorkbook } from '@/lib/relatorio-estoque-xls';
import {
  parseRelatorioProdutosPdf,
  pdfRowSlug,
  pdfRowToCatalogPrice,
} from '@/lib/relatorio-produtos-pdf';
import { importFileTooLarge, MAX_IMPORT_FILE_DESC } from '@/lib/import-upload-limits';
import { resolveImportFallbackCategoryId } from '@/lib/import-fallback-category';

export const dynamic = 'force-dynamic';

const MAX_PREVIEW = 40;

function isPdfFile(file: Blob, name: string): boolean {
  const n = name.toLowerCase();
  return file.type === 'application/pdf' || n.endsWith('.pdf');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const categoryIdRaw = form.get('categoryId');
    const categoryIdForm = typeof categoryIdRaw === 'string' ? categoryIdRaw.trim() : '';
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o ficheiro no campo file' }, { status: 400 });
    }

    const resolved = await resolveImportFallbackCategoryId(
      categoryIdForm.length ? categoryIdForm : undefined
    );
    if (!resolved) {
      return NextResponse.json(
        {
          error: categoryIdForm.length
            ? 'Categoria (reserva) inválida ou não encontrada.'
            : 'Nenhuma categoria macro na base. Crie as categorias da vitrine ou escolha uma reserva.',
        },
        { status: 400 }
      );
    }
    const categoryId = resolved.id;

    const fname = file instanceof File ? file.name : 'upload';
    if (importFileTooLarge(file)) {
      return NextResponse.json(
        { error: `Ficheiro demasiado grande (máx. ${MAX_IMPORT_FILE_DESC})` },
        { status: 400 }
      );
    }
    const buf = await file.arrayBuffer();

    if (isPdfFile(file, fname)) {
      const { rows, warnings } = await parseRelatorioProdutosPdf(buf);
      const sample = rows.slice(0, MAX_PREVIEW).map((r) => ({
        code: r.codigo,
        name: r.produto,
        stock: r.estoque,
        price: pdfRowToCatalogPrice(r),
        slug: pdfRowSlug(r),
        barcode: r.codBarra || undefined,
        status: r.status,
        vendaPrazo: r.vendaPrazo,
        custo: r.custo,
        line: r.lineIndex,
        source: 'pdf' as const,
      }));

      return NextResponse.json({
        source: 'pdf',
        categoryId,
        fallbackCategoryAuto: !resolved.usedExplicit,
        totalRows: rows.length,
        previewCount: sample.length,
        sample,
        warnings,
      });
    }

    if (isWordLikeCatalogFile(fname, file.type)) {
      const { rows, warnings, source } = await parseRelatorioEstoqueWordLike(buf, fname);
      const sample = rows.slice(0, MAX_PREVIEW).map((r) => ({
        code: r.code,
        name: r.name,
        grupo: r.grupo,
        marca: r.marca,
        stock: r.stock,
        price: r.price,
        pricePrazo: r.pricePrazo > 0 ? r.pricePrazo : undefined,
        slug: importRowSlug(r.code, r.name),
        sheet: r.sheetName,
        row: r.rowIndex,
        source,
      }));

      return NextResponse.json({
        source,
        categoryId,
        fallbackCategoryAuto: !resolved.usedExplicit,
        totalRows: rows.length,
        previewCount: sample.length,
        sample,
        warnings,
      });
    }

    const { rows, warnings } = parseRelatorioEstoqueWorkbook(buf, { fileName: fname });
    const sample = rows.slice(0, MAX_PREVIEW).map((r) => ({
      code: r.code,
      name: r.name,
      grupo: r.grupo,
      marca: r.marca,
      stock: r.stock,
      price: r.price,
      pricePrazo: r.pricePrazo > 0 ? r.pricePrazo : undefined,
      slug: importRowSlug(r.code, r.name),
      sheet: r.sheetName,
      row: r.rowIndex,
      source: 'xls' as const,
    }));

    return NextResponse.json({
      source: 'xls',
      categoryId,
      fallbackCategoryAuto: !resolved.usedExplicit,
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
