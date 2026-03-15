'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Clock, Truck, CheckCircle, DollarSign, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  completed: number;
  totalSpent: number;
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  itemsCount: number;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession() ?? {};
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para acessar sua conta');
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const orders = await res.json() ?? [];
        
        const orderStats: OrderStats = {
          total: orders.length,
          pending: orders.filter((o: any) => o.status === 'PENDING').length,
          processing: orders.filter((o: any) => o.status === 'PROCESSING').length,
          shipped: orders.filter((o: any) => o.status === 'SHIPPED').length,
          completed: orders.filter((o: any) => o.status === 'COMPLETED').length,
          totalSpent: orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0),
        };

        setStats(orderStats);
        
        const recent = orders
          .slice(0, 5)
          .map((order: any) => ({
            id: order.id,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt,
            itemsCount: order.items?.length ?? 0,
          }));
        setRecentOrders(recent);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    PENDING: { label: 'Pendente', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    PROCESSING: { label: 'Processando', icon: Package, color: 'text-blue-600 bg-blue-50' },
    SHIPPED: { label: 'Enviado', icon: Truck, color: 'text-purple-600 bg-purple-50' },
    COMPLETED: { label: 'Concluído', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Pedidos',
      value: stats.total,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: 'Pedidos Pendentes',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Pedidos Enviados',
      value: stats.shipped,
      icon: Truck,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Gasto',
      value: `R$ ${stats.totalSpent.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {(session?.user as any)?.name?.split(' ')[0] ?? 'Cliente'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Acompanhe seus pedidos e gerencie sua conta
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Pedidos Recentes</h2>
        </div>
        <div className="p-6">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Você ainda não realizou nenhum pedido</p>
              <a
                href="/catalogo"
                className="mt-4 inline-block text-red-600 hover:text-red-700 font-medium"
              >
                Ver catálogo de produtos
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const statusInfo = statusConfig[order.status] ?? statusConfig.PENDING;
                const StatusIcon = statusInfo.icon;
                const orderDate = new Date(order.createdAt);

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">
                          Pedido #{order.id.substring(0, 8)}
                        </p>
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.itemsCount} item(s) •{' '}
                        {orderDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        R$ {order.total.toFixed(2)}
                      </p>
                      <a
                        href={`/minha-conta/pedidos/${order.id}`}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Ver detalhes
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
