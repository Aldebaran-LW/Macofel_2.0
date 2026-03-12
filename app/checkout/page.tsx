'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Package, User, MapPin, Phone, Mail, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
  };
}

interface Cart {
  items: CartItem[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession() ?? {};
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para finalizar a compra');
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      setFormData({
        customerName: user?.name ?? '',
        customerEmail: user?.email ?? '',
        customerPhone: '',
        deliveryAddress: '',
        notes: '',
      });
      fetchCart();
    }
  }, [status, session]);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        if ((data?.items?.length ?? 0) === 0) {
          toast.error('Seu carrinho está vazio');
          router.push('/carrinho');
          return;
        }
        setCart(data);
      }
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.deliveryAddress) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Pedido realizado com sucesso!');
        router.push(`/meus-pedidos`);
      } else {
        toast.error(data?.error ?? 'Erro ao finalizar pedido');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao finalizar pedido');
    } finally {
      setSubmitting(false);
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

  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + (item?.product?.price ?? 0) * (item?.quantity ?? 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar Compra</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-red-600" />
                  Dados Pessoais
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Nome Completo *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerEmail">Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customerPhone">Telefone *</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="customerPhone"
                          placeholder="(11) 99999-9999"
                          value={formData.customerPhone}
                          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                          required
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-red-600" />
                  Endereço de Entrega
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryAddress">Endereço Completo *</Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Textarea
                        id="deliveryAddress"
                        placeholder="Rua, Número, Bairro, Cidade/Estado, CEP"
                        value={formData.deliveryAddress}
                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                        required
                        className="pl-10 min-h-[100px]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <div className="relative mt-1">
                      <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Textarea
                        id="notes"
                        placeholder="Ponto de referência, instruções de entrega, etc."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-red-600" />
                  Resumo
                </h2>

                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item?.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 line-clamp-1">
                        {item?.quantity}x {item?.product?.name}
                      </span>
                      <span className="font-medium">
                        R$ {((item?.product?.price ?? 0) * (item?.quantity ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-red-600">R$ {subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Pagamento na Entrega</p>
                      <p className="text-xs">O pagamento será realizado diretamente ao entregador.</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Processando...
                    </span>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
