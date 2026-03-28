import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import mongoPrisma from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const products = await mongoPrisma.product.findMany({
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { stock: 'asc' },
  });

  const items = products.filter((p) => (p.stock ?? 0) <= Math.max(0, p.minStock ?? 0) || (p.stock ?? 0) === 0);

  return NextResponse.json({
    total: items.length,
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock ?? 0,
      minStock: p.minStock ?? 0,
      category: p.category ? { id: p.category.id, name: p.category.name } : null,
    })),
  });
}

