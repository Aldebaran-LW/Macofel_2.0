import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { connectToDatabase, getProducts } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Conectar ao MongoDB
    await connectToDatabase();

    // Buscar produtos do MongoDB e estatísticas do PostgreSQL
    const [productsResult, totalOrders, totalCustomers, orders] = await Promise.all([
      getProducts({}), // Buscar todos os produtos para contar
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.order.findMany({ select: { total: true } }),
    ]);

    const totalProducts = productsResult.total;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order?.total ?? 0), 0);

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue,
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
