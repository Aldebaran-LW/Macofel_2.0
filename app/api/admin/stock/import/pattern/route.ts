import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import { stockImportFingerprintFromHeaders } from '@/lib/stock-import-fingerprint';
import { findStockImportPattern, upsertStockImportPattern } from '@/lib/stock-import-patterns-mongo';
import {
  guessToColumnMapping,
  mappingTargetsExistInHeaders,
  type StockImportColumnMapping,
} from '@/lib/stock-import-rows-with-mapping';

export const dynamic = 'force-dynamic';

type Body = {
  action?: 'lookup' | 'save';
  headers?: string[];
  mapping?: Partial<StockImportColumnMapping>;
};

function mergeWithSaved(
  headers: string[],
  saved: StockImportColumnMapping | null | undefined
): StockImportColumnMapping {
  const headerSet = new Set(headers.map((h) => String(h ?? '').trim()).filter(Boolean));
  const guess = guessToColumnMapping(headers);
  if (!saved) return guess;
  const mapping: StockImportColumnMapping = { ...guess };
  if (saved.codigo && headerSet.has(String(saved.codigo).trim())) mapping.codigo = saved.codigo;
  if (saved.quantidade && headerSet.has(String(saved.quantidade).trim())) {
    mapping.quantidade = saved.quantidade;
  }
  if (saved.nome && headerSet.has(String(saved.nome).trim())) mapping.nome = saved.nome;
  if (saved.nome === null) mapping.nome = null;
  return mapping;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const action = body?.action === 'save' ? 'save' : 'lookup';
  const headers = Array.isArray(body?.headers)
    ? body!.headers!.map((h) => String(h ?? '').trim()).filter(Boolean)
    : [];

  if (headers.length === 0) {
    return NextResponse.json({ error: 'headers obrigatório (array não vazio)' }, { status: 400 });
  }

  const fingerprint = stockImportFingerprintFromHeaders(headers);
  const actorEmail = (session.user as { email?: string | null }).email ?? null;

  if (action === 'lookup') {
    const doc = await findStockImportPattern(fingerprint);
    const mapping = mergeWithSaved(headers, doc?.mapping as StockImportColumnMapping | undefined);
    return NextResponse.json({
      fingerprint,
      mapping,
      fromSavedPattern: Boolean(doc),
      usage_count: typeof doc?.usage_count === 'number' ? doc.usage_count : 0,
    });
  }

  const raw = body?.mapping ?? {};
  const mapping: StockImportColumnMapping = {
    codigo: typeof raw.codigo === 'string' && raw.codigo.trim() ? raw.codigo.trim() : null,
    quantidade:
      typeof raw.quantidade === 'string' && raw.quantidade.trim() ? raw.quantidade.trim() : null,
    nome: typeof raw.nome === 'string' && raw.nome.trim() ? raw.nome.trim() : null,
  };

  if (!mapping.codigo || !mapping.quantidade) {
    return NextResponse.json(
      { error: 'mapping.codigo e mapping.quantidade são obrigatórios' },
      { status: 400 }
    );
  }

  const { ok, missing } = mappingTargetsExistInHeaders(headers, mapping);
  if (!ok) {
    return NextResponse.json(
      { error: 'Colunas inválidas para estes cabeçalhos', missing },
      { status: 400 }
    );
  }

  await upsertStockImportPattern(fingerprint, headers, mapping, actorEmail);

  return NextResponse.json({
    ok: true,
    fingerprint,
    mapping,
    message: 'Mapeamento guardado para este formato de relatório.',
  });
}
