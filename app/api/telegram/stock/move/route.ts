import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    const body = await req.json().catch(() => null);
    const productId = String(body?.productId ?? '').trim();
    const deltaRaw = body?.delta;
    const reason = body?.reason != null ? String(body.reason).trim().slice(0, 200) : null;

    const delta = typeof deltaRaw === 'number' ? deltaRaw : parseInt(String(deltaRaw ?? ''), 10);
    if (!productId || !ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'productId inválido' }, { status: 400 });
    }
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: 'delta inválido (use inteiro != 0)' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const productsCol = db.collection('products');
    const movementsCol = db.collection('stock_movements');

    const oid = new ObjectId(productId);
    const current: any = await productsCol.findOne({ _id: oid }, { projection: { stock: 1, name: 1 } });
    if (!current) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const before = typeof current.stock === 'number' ? Math.trunc(current.stock) : Number(current.stock) || 0;
    const after = before + Math.trunc(delta);

    const now = new Date();
    const res = await productsCol.updateOne(
      { _id: oid },
      { $set: { stock: after, updatedAt: now } }
    );
    if (res.matchedCount <= 0) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Log em Mongo para auditoria operacional do estoque (útil pro bot + relatórios futuros)
    movementsCol
      .insertOne({
        productId: oid,
        productName: current?.name != null ? String(current.name) : null,
        delta: Math.trunc(delta),
        before,
        after,
        reason,
        actor: {
          userId: linked.user.userId,
          email: linked.user.email,
          role: linked.user.role,
          name: linked.user.name,
          telegramUserId: linked.user.telegramUserId,
        },
        createdAt: now,
      })
      .catch(() => {});

    return NextResponse.json({ ok: true, productId, before, after });
  } catch (error: unknown) {
    console.error('[api/telegram/stock/move]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

