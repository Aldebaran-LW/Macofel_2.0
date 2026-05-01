import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';

export const dynamic = 'force-dynamic';

const escapeMongoRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    // Por hora, seguimos com “todos vinculados” (inclusive CLIENT). Se quiser restringir depois,
    // faça o gate aqui via linked.user.role.
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.min(25, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10) || 10));

    if (!q) {
      return NextResponse.json({ error: 'q é obrigatório' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const col = db.collection('products');

    const safe = escapeMongoRegex(q);
    const rx = new RegExp(safe, 'i');
    const digits = q.replace(/\D/g, '');

    const or: any[] = [{ name: rx }, { slug: rx }, { description: rx }, { codigo: rx }];
    if (digits) {
      or.push({ codBarra: digits });
      or.push({ codBarra: { $regex: escapeMongoRegex(digits), $options: 'i' } });
    }

    // Busca simples, ordenando por updatedAt/createdAt se existirem.
    const docs = await col
      .find({ $or: or })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 } as any)
      .limit(limit)
      .toArray();

    const items = docs.map((p: any) => {
      const id = p?._id instanceof ObjectId ? p._id.toString() : String(p?._id ?? '');
      const rawImageUrls = Array.isArray(p.imageUrls) ? p.imageUrls : [];
      const cleanImageUrls = rawImageUrls
        .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u: string) => u.length > 0);
      const primaryImageUrl =
        (typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '') || cleanImageUrls[0] || null;
      return {
        id,
        name: String(p?.name ?? '').trim(),
        codigo: p?.codigo != null ? String(p.codigo) : null,
        codBarra: p?.codBarra != null ? String(p.codBarra) : null,
        stock: typeof p?.stock === 'number' ? Math.trunc(p.stock) : Number(p?.stock) || 0,
        price: typeof p?.price === 'number' ? p.price : Number(p?.price) || 0,
        imageUrl: primaryImageUrl,
      };
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('[api/telegram/products/search]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

