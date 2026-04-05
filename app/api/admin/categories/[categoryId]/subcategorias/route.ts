import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const MAX_LABEL = 500;

function requireAdmin(session: any) {
  if (!session?.user || !isAdminDashboardRole((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  return null;
}

async function collectCategoryTreeIds(db: any, rootId: string): Promise<{ objectIds: ObjectId[]; stringIds: string[] }> {
  const categories = db.collection('categories');
  const objectIds: ObjectId[] = [new ObjectId(rootId)];
  const stringIds = new Set<string>([rootId]);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const match: any[] = [{ parentId: current }];
    if (ObjectId.isValid(current)) {
      match.push({ parentId: new ObjectId(current) });
    }
    const children = await categories.find({ $or: match }, { projection: { _id: 1 } }).toArray();
    for (const child of children) {
      const childId = String(child._id);
      if (stringIds.has(childId)) continue;
      stringIds.add(childId);
      objectIds.push(child._id);
      queue.push(childId);
    }
  }

  return { objectIds, stringIds: Array.from(stringIds) };
}

/** Valores distintos de `subcategoria` nos produtos desta categoria. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { categoryId } = await ctx.params;
  if (!categoryId || !ObjectId.isValid(categoryId)) {
    return NextResponse.json({ error: 'categoryId inválido' }, { status: 400 });
  }

  const cat = await mongoPrisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }

  const db = await connectToDatabase();
  const tree = await collectCategoryTreeIds(db, categoryId);
  const rows = await db
    .collection('products')
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          categoryId: { $in: [...tree.objectIds, ...tree.stringIds] },
          subcategoria: { $nin: [null, ''] },
        },
      },
      { $group: { _id: '$subcategoria', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return NextResponse.json({
    category: { id: cat.id, name: cat.name, slug: cat.slug },
    subcategorias: rows.map((r) => ({ label: r._id, count: r.count })),
  });
}

/**
 * Renomeia o texto de subcategoria em todos os produtos desta categoria (`from` → `to`).
 * `to` vazio ou omitido → grava `null` (limpa).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { categoryId } = await ctx.params;
  if (!categoryId || !ObjectId.isValid(categoryId)) {
    return NextResponse.json({ error: 'categoryId inválido' }, { status: 400 });
  }

  const cat = await mongoPrisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }

  let body: { from?: string; to?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const from = String(body.from ?? '').trim();
  const toRaw = body.to != null ? String(body.to).trim() : '';
  if (!from) {
    return NextResponse.json({ error: 'Campo "from" (valor atual) é obrigatório' }, { status: 400 });
  }
  if (from.length > MAX_LABEL || toRaw.length > MAX_LABEL) {
    return NextResponse.json({ error: `Texto demasiado longo (máx. ${MAX_LABEL})` }, { status: 400 });
  }

  const to = toRaw.length ? toRaw : null;
  const db = await connectToDatabase();
  const tree = await collectCategoryTreeIds(db, categoryId);
  const resultRaw = await db.collection('products').updateMany(
    {
      categoryId: { $in: [...tree.objectIds, ...tree.stringIds] },
      subcategoria: from,
    },
    {
      $set: {
        subcategoria: to,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({
    updated: resultRaw.modifiedCount ?? 0,
    categoryId,
    from,
    to: to ?? null,
  });
}
