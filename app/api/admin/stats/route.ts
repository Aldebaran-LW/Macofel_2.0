import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import prisma from '@/lib/db';
import { connectToDatabase, getProducts } from '@/lib/mongodb-native';
import { getTaxDefaultPercent } from '@/lib/server-app-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Conectar ao MongoDB
    await connectToDatabase();

    // Buscar produtos do MongoDB e estatísticas do PostgreSQL
    const [productsResult, totalOrders, totalCustomers, orders, recentOrders, taxDefaultPercent] =
      await Promise.all([
      getProducts({}), // Buscar todos os produtos para contar
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.order.findMany({ select: { total: true, status: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          customerName: true,
        },
      }),
      getTaxDefaultPercent(),
    ]);

    const totalProducts = productsResult.total;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order?.total ?? 0), 0);
    const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
    const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').length;

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      completedOrders,
      taxDefaultPercent,
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
