import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import {
  runPdfRelatorioProductImport,
  runRelatorioProductImport,
} from '@/lib/product-relatorio-import';
import {
  isWordLikeCatalogFile,
  parseRelatorioEstoqueWordLike,
} from '@/lib/relatorio-estoque-doc-word';
import { parseRelatorioEstoqueWorkbook } from '@/lib/relatorio-estoque-xls';
import { parseRelatorioProdutosPdf } from '@/lib/relatorio-produtos-pdf';
import { importFileTooLarge, MAX_IMPORT_FILE_DESC } from '@/lib/import-upload-limits';
import { resolveImportFallbackCategoryId } from '@/lib/import-fallback-category';

export const dynamic = 'force-dynamic';

function isPdfFile(file: Blob, name: string): boolean {
  const n = name.toLowerCase();
  return file.type === 'application/pdf' || n.endsWith('.pdf');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const upsertRaw = form.get('upsert');
    const upsert = upsertRaw === 'true' || upsertRaw === '1';
    const preserveRaw = form.get('preserve_stock_db');
    const preserveStockForExisting =
      preserveRaw === 'true' || preserveRaw === '1';
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
      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma linha de produto encontrada no PDF', warnings },
          { status: 400 }
        );
      }
      const { created, updated, skipped, errors } = await runPdfRelatorioProductImport(rows, {
        upsert,
        preserveStockForExisting,
        categoryId,
      });
      return NextResponse.json({
        source: 'pdf',
        created,
        updated,
        skipped,
        errors,
        warnings,
        totalParsed: rows.length,
      });
    }

    if (isWordLikeCatalogFile(fname, file.type)) {
      const { rows, warnings, source } = await parseRelatorioEstoqueWordLike(buf, fname);
      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma linha de produto encontrada', warnings },
          { status: 400 }
        );
      }
      const { created, updated, skipped, errors } = await runRelatorioProductImport(rows, {
        upsert,
        preserveStockForExisting,
        categoryId,
      });
      return NextResponse.json({
        source,
        created,
        updated,
        skipped,
        errors,
        warnings,
        totalParsed: rows.length,
      });
    }

    const { rows, warnings } = parseRelatorioEstoqueWorkbook(buf);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha de produto encontrada', warnings },
        { status: 400 }
      );
    }

    const { created, updated, skipped, errors } = await runRelatorioProductImport(rows, {
      upsert,
      preserveStockForExisting,
      categoryId,
    });

    return NextResponse.json({
      source: 'xls',
      created,
      updated,
      skipped,
      errors,
      warnings,
      totalParsed: rows.length,
    });
  } catch (e: any) {
    console.error('import produtos:', e);
    return NextResponse.json(
      { error: 'Erro ao importar', details: e?.message },
      { status: 500 }
    );
  }
}
