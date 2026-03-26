import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

type MovementType = 'entrada' | 'saida';

function parsePositiveNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

  const db = await connectToDatabase();
  const movements = await db
    .collection('inventory_movements')
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    total: movements.length,
    items: movements.map((m) => ({
      id: String(m._id),
      productId: String(m.productId),
      productName: String(m.productName ?? ''),
      type: m.type as MovementType,
      quantity: Number(m.quantity ?? 0),
      note: m.note ?? null,
      createdAt: (m.createdAt ? new Date(m.createdAt) : new Date()).toISOString(),
      createdBy: m.createdBy ?? null,
      actorId: m.actorId ?? null,
      actorEmail: m.actorEmail ?? null,
      actorRole: m.actorRole ?? null,
      actorType: m.actorType ?? null,
      source: m.source ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const productId = String(body?.productId ?? '').trim();
  const type = String(body?.type ?? '').trim() as MovementType;
  const quantity = parsePositiveNumber(body?.quantity);
  const note = typeof body?.note === 'string' ? body.note.trim() : null;

  if (!productId || (type !== 'entrada' && type !== 'saida') || !quantity) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(productId);
  } catch {
    return NextResponse.json({ error: 'productId inválido' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const products = db.collection('products');
  const movements = db.collection('inventory_movements');

  const q = Math.round(quantity);
  if (q <= 0) return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });

  // Para saída, garante que não fica negativo.
  if (type === 'saida') {
    const res = await products.updateOne(
      { _id: oid, stock: { $gte: q } },
      { $inc: { stock: -q } }
    );
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: 'Estoque insuficiente para saída' }, { status: 409 });
    }
  } else {
    await products.updateOne({ _id: oid }, { $inc: { stock: q } });
  }

  const p = await products.findOne({ _id: oid }, { projection: { name: 1 } });
  const productName = (p as any)?.name ?? 'Produto';

  const createdAt = new Date();
  const actorId = (session.user as any)?.id ?? null;
  const actorEmail = (session.user as any)?.email ?? null;
  const actorRole = (session.user as any)?.role ?? null;
  const createdBy = actorEmail ?? actorId ?? null;

  const insert = await movements.insertOne({
    productId,
    productName,
    type,
    quantity: q,
    note: note || null,
    createdAt,
    createdBy,
    actorId,
    actorEmail,
    actorRole,
    actorType: 'admin_session',
    source: 'admin_manual',
  });

  return NextResponse.json(
    {
      id: String(insert.insertedId),
      productId,
      productName,
      type,
      quantity: q,
      note: note || null,
      createdAt: createdAt.toISOString(),
    },
    { status: 201 }
  );
}

