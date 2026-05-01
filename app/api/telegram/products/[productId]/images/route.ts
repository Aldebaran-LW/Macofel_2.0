import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';

export const dynamic = 'force-dynamic';

function normalizeImageUrl(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (s.startsWith('/')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    const productId = String(params?.productId ?? '').trim();
    if (!productId || !ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'productId inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const imageUrl = normalizeImageUrl(body?.imageUrl);
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl inválida' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const productsCol = db.collection('products');
    const oid = new ObjectId(productId);

    const current: any = await productsCol.findOne(
      { _id: oid },
      { projection: { imageUrl: 1, imageUrls: 1 } }
    );
    if (!current) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const existing: string[] = Array.isArray(current.imageUrls)
      ? current.imageUrls.map((u: unknown) => String(u ?? '').trim()).filter(Boolean)
      : [];
    const merged = Array.from(new Set([...existing, imageUrl]));

    const primary =
      (typeof current.imageUrl === 'string' && current.imageUrl.trim()) ? current.imageUrl.trim() : '';
    const nextPrimary = primary || merged[0] || null;

    await productsCol.updateOne(
      { _id: oid },
      {
        $set: {
          imageUrls: merged,
          imageUrl: nextPrimary,
          updatedAt: new Date(),
          lastTelegramUpdate: {
            userId: linked.user.userId,
            telegramUserId: linked.user.telegramUserId,
            at: new Date(),
          },
        },
      }
    );

    return NextResponse.json({
      ok: true,
      productId,
      imageUrl: nextPrimary,
      imageUrls: merged,
    });
  } catch (error: unknown) {
    console.error('[api/telegram/products/:productId/images]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

