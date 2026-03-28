import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import mongoPrisma from '@/lib/mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const products = await mongoPrisma.product.findMany({
    select: { id: true, stock: true, minStock: true, price: true },
  });

  const totals = products.reduce(
    (acc, p) => {
      const stock = Number(p.stock ?? 0);
      const minStock = Number(p.minStock ?? 0);
      const price = Number(p.price ?? 0);
      acc.products += 1;
      acc.totalUnits += stock;
      acc.totalStockValue += stock * price;
      if (stock === 0 || stock <= minStock) acc.lowOrZero += 1;
      return acc;
    },
    { products: 0, totalUnits: 0, totalStockValue: 0, lowOrZero: 0 }
  );

  const db = await connectToDatabase();
  const recent = await db
    .collection('inventory_movements')
    .find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json({
    totals,
    recentMovements: recent.map((m) => ({
      id: String(m._id),
      productName: String(m.productName ?? ''),
      type: m.type,
      quantity: Number(m.quantity ?? 0),
      createdAt: (m.createdAt ? new Date(m.createdAt) : new Date()).toISOString(),
    })),
  });
}

