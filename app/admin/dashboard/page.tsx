'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  taxDefaultPercent: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    taxDefaultPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('master') === 'forbidden') {
      toast.error('Esta área é exclusiva do Master Admin.');
      router.replace('/admin/dashboard', { scroll: false });
    }
  }, [router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalProducts: data?.totalProducts ?? 0,
          totalOrders: data?.totalOrders ?? 0,
          totalCustomers: data?.totalCustomers ?? 0,
          totalRevenue: data?.totalRevenue ?? 0,
          taxDefaultPercent:
            typeof data?.taxDefaultPercent === 'number' ? data.taxDefaultPercent : 0,
        });
      } else {
        toast.error('Erro ao carregar estatísticas');
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Produtos',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total de Pedidos',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-green-500',
    },
    {
      title: 'Total de Clientes',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Receita Total',
      value: `R$ ${(stats.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bem-vindo ao Painel Administrativo</h2>
        <p className="text-gray-600">
          Gerencie produtos, categorias, pedidos e clientes do seu e-commerce.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Taxa padrão no checkout (Master → Configurações):{' '}
          <span className="font-medium text-gray-800">{stats.taxDefaultPercent}%</span>
        </p>
      </div>
    </div>
  );
}
