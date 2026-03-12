'use client';

import { useState, useEffect } from 'react';
import { Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Order {
  id: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  createdAt: string;
  items: Array<{ id: string; quantity: number; price: number; product: { name: string } }>;
  user: { email: string; firstName: string; lastName: string };
}

const statusConfig: Record<string, any> = {
  PENDING: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Processando', icon: Package, color: 'bg-blue-100 text-blue-800' },
  SHIPPED: { label: 'Enviado', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Concluído', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data ?? []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success('Status atualizado!');
        fetchOrders();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gerenciar Pedidos</h1>

      <div className="space-y-4">
        {orders?.map?.((order) => {
          const statusInfo = statusConfig[order?.status ?? 'PENDING'];
          const StatusIcon = statusInfo?.icon;

          return (
            <div key={order?.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold text-lg">Pedido #{order?.id?.substring?.(0, 8)}</p>
                  <p className="text-sm text-gray-600">
                    {order?.user?.firstName} {order?.user?.lastName} ({order?.user?.email})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order?.createdAt ?? '').toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo?.color}`}>
                  {StatusIcon && <StatusIcon className="h-4 w-4 mr-1" />}
                  {statusInfo?.label}
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="font-medium mb-2">Itens:</h4>
                {order?.items?.map?.((item) => (
                  <p key={item?.id} className="text-sm text-gray-600">
                    {item?.quantity}x {item?.product?.name} - R$ {((item?.price ?? 0) * (item?.quantity ?? 0)).toFixed(2)}
                  </p>
                ))}
                <p className="font-bold mt-2">Total: R$ {order?.total?.toFixed?.(2)}</p>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm"><strong>Endereço:</strong> {order?.deliveryAddress}</p>
                <p className="text-sm"><strong>Telefone:</strong> {order?.customerEmail}</p>
              </div>

              <div className="flex gap-2">
                {['PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={order?.status === status ? 'default' : 'outline'}
                    onClick={() => updateStatus(order?.id ?? '', status)}
                    className={order?.status === status ? 'bg-red-600' : ''}
                  >
                    {statusConfig[status]?.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
