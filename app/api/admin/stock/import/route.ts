import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

type ImportMode = 'add' | 'set';

type ImportItem = {
  productId: string;
  quantity: number;
  externalCode?: string | null;
};

function isValidMode(v: unknown): v is ImportMode {
  return v === 'add' || v === 'set';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const mode: ImportMode = isValidMode(body?.mode) ? body.mode : 'add';
  const source = typeof body?.source === 'string' ? body.source : 'unknown';
  const documentHash = typeof body?.documentHash === 'string' ? body.documentHash : null;
  const items: ImportItem[] = Array.isArray(body?.items) ? body.items : [];
  const mappingsToUpsert: Array<{ externalCode: string; productId: string; source?: string }> = Array.isArray(
    body?.mappingsToUpsert
  )
    ? body.mappingsToUpsert
    : [];

  if (items.length === 0) {
    return NextResponse.json({ error: 'Nenhum item para importar' }, { status: 400 });
  }

  const normalized = items
    .map((it) => ({
      productId: String(it?.productId ?? '').trim(),
      externalCode: typeof it?.externalCode === 'string' ? it.externalCode.trim() : null,
      quantity: Number(it?.quantity),
    }))
    .filter((it) => it.productId && Number.isFinite(it.quantity) && it.quantity > 0);

  if (normalized.length === 0) {
    return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const products = db.collection('products');
  const imports = db.collection('inventory_imports');
  const documents = db.collection('inventory_import_documents');
  const mappings = db.collection('inventory_product_mappings');

  let applied = 0;
  const errors: Array<{ productId: string; error: string }> = [];

  for (const it of normalized) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(it.productId);
    } catch {
      errors.push({ productId: it.productId, error: 'productId não é ObjectId' });
      continue;
    }

    const q = Math.round(it.quantity);
    if (q <= 0) continue;

    try {
      if (mode === 'set') {
        await products.updateOne({ _id: oid }, { $set: { stock: q } });
      } else {
        await products.updateOne({ _id: oid }, { $inc: { stock: q } });
      }
      applied++;
    } catch (e: any) {
      errors.push({ productId: it.productId, error: e?.message || 'Falha ao atualizar stock' });
    }
  }

  const createdAt = new Date();
  const createdBy = (session.user as any)?.email ?? (session.user as any)?.id ?? null;

  // Salva documento (dedupe/registro) se tiver hash
  if (documentHash) {
    await documents.updateOne(
      { documentHash },
      {
        $setOnInsert: {
          documentHash,
          source,
          createdAt,
          createdBy,
        },
      },
      { upsert: true }
    );
  }

  // Upsert mapeamentos (externalCode -> productId)
  for (const m of mappingsToUpsert) {
    const externalCode = String(m?.externalCode ?? '').trim();
    const productId = String(m?.productId ?? '').trim();
    if (!externalCode || !productId) continue;
    try {
      void new ObjectId(productId);
    } catch {
      continue;
    }
    await mappings.updateOne(
      { externalCode },
      {
        $set: {
          externalCode,
          productId,
          source: typeof m?.source === 'string' ? m.source : source,
          updatedAt: createdAt,
          updatedBy: createdBy,
        },
        $setOnInsert: {
          createdAt,
          createdBy,
        },
      },
      { upsert: true }
    );
  }

  await imports.insertOne({
    mode,
    source,
    documentHash,
    totalReceived: items.length,
    totalNormalized: normalized.length,
    applied,
    errorsCount: errors.length,
    errors,
    createdAt,
    createdBy,
  });

  return NextResponse.json({
    success: true,
    mode,
    source,
    documentHash,
    applied,
    errorsCount: errors.length,
    errors,
  });
}

