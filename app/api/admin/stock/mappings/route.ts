import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

type MappingSource = 'nfe_xml' | 'csv' | 'xlsx' | 'manual' | 'unknown';

function normCode(v: unknown) {
  const s = String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  return s.length ? s : null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = normCode(url.searchParams.get('code'));
  if (!q) return NextResponse.json({ total: 0, items: [] });

  const db = await connectToDatabase();
  const items = await db
    .collection('inventory_product_mappings')
    .find({ externalCode: q })
    .sort({ updatedAt: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json({
    total: items.length,
    items: items.map((m) => ({
      id: String(m._id),
      externalCode: String(m.externalCode),
      productId: String(m.productId),
      source: String(m.source ?? 'unknown'),
      updatedAt: (m.updatedAt ? new Date(m.updatedAt) : new Date()).toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const externalCode = normCode(body?.externalCode);
  const productId = normCode(body?.productId);
  const source = (normCode(body?.source) as MappingSource | null) ?? 'manual';

  if (!externalCode || !productId) {
    return NextResponse.json({ error: 'externalCode e productId são obrigatórios' }, { status: 400 });
  }

  try {
    // validação superficial de ObjectId
    void new ObjectId(productId);
  } catch {
    return NextResponse.json({ error: 'productId inválido' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const col = db.collection('inventory_product_mappings');
  const now = new Date();
  const createdBy = (session.user as any)?.email ?? (session.user as any)?.id ?? null;

  await col.updateOne(
    { externalCode },
    {
      $set: {
        externalCode,
        productId,
        source: source ?? 'manual',
        updatedAt: now,
        updatedBy: createdBy,
      },
      $setOnInsert: {
        createdAt: now,
        createdBy,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}

