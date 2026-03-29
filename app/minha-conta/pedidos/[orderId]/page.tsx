'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, Clock, Truck, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

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
      id: string;
      name: string;
      imageUrl?: string;
      slug: string;
    };
  }>;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; description: string }> = {
  PENDING: { 
    label: 'Pendente', 
    icon: Clock, 
    color: 'text-yellow-600 bg-yellow-50',
    description: 'Seu pedido está aguardando processamento'
  },
  PROCESSING: { 
    label: 'Processando', 
    icon: Package, 
    color: 'text-blue-600 bg-blue-50',
    description: 'Seu pedido está sendo preparado'
  },
  SHIPPED: { 
    label: 'Enviado', 
    icon: Truck, 
    color: 'text-purple-600 bg-purple-50',
    description: 'Seu pedido foi enviado'
  },
  COMPLETED: { 
    label: 'Concluído', 
    icon: CheckCircle, 
    color: 'text-green-600 bg-green-50',
    description: 'Seu pedido foi entregue'
  },
  CANCELLED: { 
    label: 'Cancelado', 
    icon: XCircle, 
    color: 'text-red-600 bg-red-50',
    description: 'Seu pedido foi cancelado'
  },
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawOrderId = params?.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  const { data: session, status } = useSession() ?? {};
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para ver os detalhes do pedido');
      router.push('/login');
    } else if (status === 'authenticated' && orderId) {
      fetchOrder();
    }
  }, [status, orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        toast.error('Pedido não encontrado');
        router.push('/minha-conta/pedidos');
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast.error('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const statusInfo = statusConfig[order.status] ?? statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;
  const orderDate = new Date(order.createdAt);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/minha-conta/pedidos"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Meus Pedidos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Detalhes do Pedido
        </h1>
        <p className="text-gray-600 mt-2">
          Pedido #{order.id.substring(0, 8)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Status do Pedido</h2>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}
              >
                <StatusIcon className="h-5 w-5 mr-2" />
                {statusInfo.label}
              </div>
            </div>
            <p className="text-gray-600">{statusInfo.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Pedido realizado em {orderDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Itens */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Itens do Pedido</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  {item.product.imageUrl && (
                    <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/produto/${item.product.slug}`}
                      className="font-medium text-gray-900 hover:text-red-600"
                    >
                      {item.product.name}
                    </Link>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Quantidade: {item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>R$ {order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span>Grátis</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-red-600">
                  R$ {order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Entrega</h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
