import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

type Source = 'csv' | 'xlsx' | 'xml' | 'unknown';

type RawItem = {
  externalCode?: string | null;
  name?: string | null;
  quantity?: number;
};

type PreviewRequest = {
  source?: Source;
  preventDuplicate?: boolean;
  documentText?: string | null; // recomendado para XML (NF-e) -> hash
  items?: RawItem[];
};

function normStr(v: unknown) {
  const s = String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  return s.length ? s : null;
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function computeHash(text: string) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as PreviewRequest | null;
  if (!body) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const source: Source = (body?.source as Source) ?? 'unknown';
  const preventDuplicate = body?.preventDuplicate === true;
  const documentText = typeof body?.documentText === 'string' ? body.documentText : null;
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  const items = rawItems
    .map((it) => ({
      externalCode: normStr(it?.externalCode),
      name: normStr(it?.name),
      quantity: safeNumber(it?.quantity),
    }))
    .filter((it) => (it.externalCode || it.name) && (it.quantity ?? 0) > 0) as Array<{
    externalCode: string | null;
    name: string | null;
    quantity: number;
  }>;

  if (items.length === 0) {
    return NextResponse.json({ error: 'Nenhum item válido para prévia' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const documents = db.collection('inventory_import_documents');

  let documentHash: string | null = null;
  if (documentText && documentText.trim().length) {
    documentHash = computeHash(documentText.trim());
    if (preventDuplicate) {
      const existing = await documents.findOne({ documentHash });
      if (existing) {
        return NextResponse.json(
          {
            error: 'Documento já importado anteriormente',
            documentHash,
            importedAt: existing.createdAt ?? null,
          },
          { status: 409 }
        );
      }
    }
  }

  // Carrega mapeamentos para códigos presentes
  const codes = Array.from(new Set(items.map((i) => i.externalCode).filter(Boolean))) as string[];
  const mappingByCode = new Map<string, string>();
  if (codes.length) {
    const mappings = await db
      .collection('inventory_product_mappings')
      .find({ externalCode: { $in: codes } })
      .toArray();
    for (const m of mappings) {
      if (m?.externalCode && m?.productId) {
        mappingByCode.set(String(m.externalCode), String(m.productId));
      }
    }
  }

  // Carrega produtos alvo (para validação e exibição)
  const products = db.collection('products');

  const resolved: Array<{
    externalCode: string | null;
    name: string | null;
    quantity: number;
    productId: string;
    productName: string;
    resolution: 'by_objectid' | 'by_mapping';
  }> = [];

  const conflicts: Array<{
    externalCode: string | null;
    name: string | null;
    quantity: number;
    reason: 'no_match' | 'invalid_objectid' | 'mapped_product_missing';
    suggestedProductId?: string | null;
  }> = [];

  for (const it of items) {
    const code = it.externalCode;
    const q = Math.round(it.quantity);
    if (q <= 0) continue;

    let productId: string | null = null;
    let resolution: 'by_objectid' | 'by_mapping' | null = null;

    // 1) Se o código já for um ObjectId, tenta usar direto.
    if (code) {
      try {
        void new ObjectId(code);
        productId = code;
        resolution = 'by_objectid';
      } catch {
        // não é ObjectId
      }
    }

    // 2) Se não, tenta via mapeamento.
    if (!productId && code && mappingByCode.has(code)) {
      productId = mappingByCode.get(code) ?? null;
      resolution = 'by_mapping';
    }

    if (!productId) {
      conflicts.push({
        externalCode: code,
        name: it.name,
        quantity: q,
        reason: code ? 'invalid_objectid' : 'no_match',
      });
      continue;
    }

    const p = await products.findOne(
      { _id: new ObjectId(productId) },
      { projection: { name: 1 } }
    );
    if (!p) {
      conflicts.push({
        externalCode: code,
        name: it.name,
        quantity: q,
        reason: 'mapped_product_missing',
        suggestedProductId: productId,
      });
      continue;
    }

    resolved.push({
      externalCode: code,
      name: it.name,
      quantity: q,
      productId,
      productName: String((p as any)?.name ?? 'Produto'),
      resolution: resolution ?? 'by_mapping',
    });
  }

  return NextResponse.json({
    source,
    documentHash,
    totals: {
      received: rawItems.length,
      valid: items.length,
      resolved: resolved.length,
      conflicts: conflicts.length,
    },
    resolved,
    conflicts,
  });
}

