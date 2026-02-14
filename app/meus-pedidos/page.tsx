'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';

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

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Meus Pedidos</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Package className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Nenhum pedido encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              Você ainda não realizou nenhum pedido
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
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
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo?.color}`}
                      >
                        {StatusIcon && <StatusIcon className="h-4 w-4 mr-1.5" />}
                        {statusInfo?.label}
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
      </main>

      <Footer />
    </div>
  );
}
