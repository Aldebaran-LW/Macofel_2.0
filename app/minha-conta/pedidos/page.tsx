'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, Clock, Truck, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Order {
  id: string;
  status: string;
  total: number;
  customerName: string;
  deliveryAddress: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      imageUrl?: string;
    };
  }>;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendente', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  PROCESSING: { label: 'Processando', icon: Package, color: 'text-blue-600 bg-blue-50' },
  SHIPPED: { label: 'Enviado', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  COMPLETED: { label: 'Concluído', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  CANCELLED: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

export default function MeusPedidosPage() {
  const router = useRouter();
  const { data: session, status } = useSession() ?? {};
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para ver seus pedidos');
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data ?? []);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe o status dos seus pedidos
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Todos
        </button>
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === key
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Package className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            {filter === 'all' ? 'Nenhum pedido encontrado' : 'Nenhum pedido com este status'}
          </h2>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? 'Você ainda não realizou nenhum pedido'
              : 'Não há pedidos com este status'}
          </p>
          {filter === 'all' && (
            <Link
              href="/catalogo"
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Ver Catálogo
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const statusInfo = statusConfig[order?.status ?? 'PENDING'];
            const StatusIcon = statusInfo?.icon;
            const orderDate = new Date(order?.createdAt ?? '');

            return (
              <div key={order?.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        Pedido #{order?.id?.substring?.(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {orderDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo?.color}`}
                      >
                        {StatusIcon && <StatusIcon className="h-4 w-4 mr-1.5" />}
                        {statusInfo?.label}
                      </div>
                      <Link
                        href={`/minha-conta/pedidos/${order.id}`}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="px-6 py-4">
                  <div className="space-y-3">
                    {order?.items?.map?.((item) => (
                      <div key={item?.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <span className="text-gray-700">
                            {item?.quantity}x {item?.product?.name}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          R$ {((item?.price ?? 0) * (item?.quantity ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{order?.customerName}</p>
                      <p className="text-xs mt-1 line-clamp-2">{order?.deliveryAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold text-red-600">
                        R$ {order?.total?.toFixed?.(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
