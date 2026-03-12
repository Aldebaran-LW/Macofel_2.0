'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    imageUrl?: string;
    category: {
      name: string;
    };
  };
}

interface Cart {
  id: string;
  items: CartItem[];
}

export default function CarrinhoPage() {
  const router = useRouter();
  const { data: session, status } = useSession() ?? {};
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para acessar o carrinho');
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchCart();
    }
  }, [status]);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdating(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (res.ok) {
        await fetchCart();
        toast.success('Quantidade atualizada');
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao atualizar quantidade');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar quantidade');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchCart();
        toast.success('Item removido do carrinho');
      } else {
        toast.error('Erro ao remover item');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao remover item');
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!confirm('Deseja realmente limpar o carrinho?')) return;

    try {
      const res = await fetch('/api/cart', { method: 'DELETE' });
      if (res.ok) {
        await fetchCart();
        toast.success('Carrinho limpo');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao limpar carrinho');
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
  const isEmpty = items.length === 0;
  const subtotal = items.reduce(
    (sum, item) => sum + (item?.product?.price ?? 0) * (item?.quantity ?? 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrinho de Compras</h1>

        {isEmpty ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione produtos para começar suas compras
            </p>
            <Link href="/catalogo">
              <Button className="bg-red-600 hover:bg-red-700">
                Ir para o Catálogo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item?.id}
                  className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4"
                >
                  {/* Image */}
                  <Link
                    href={`/produto/${item?.product?.slug}`}
                    className="relative w-full sm:w-24 aspect-square bg-gray-100 rounded overflow-hidden flex-shrink-0"
                  >
                    {item?.product?.imageUrl && (
                      <Image
                        src={item.product.imageUrl}
                        alt={item?.product?.name ?? 'Produto'}
                        fill
                        className="object-cover"
                      />
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/produto/${item?.product?.slug}`}
                        className="font-semibold text-lg hover:text-red-600 line-clamp-2"
                      >
                        {item?.product?.name}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">
                        {item?.product?.category?.name}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xl font-bold text-red-600">
                        R$ {((item?.product?.price ?? 0) * (item?.quantity ?? 0)).toFixed(2)}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item?.id ?? '', (item?.quantity ?? 1) - 1)}
                            disabled={updating === item?.id || (item?.quantity ?? 1) <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 min-w-[2rem] text-center">{item?.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item?.id ?? '', (item?.quantity ?? 0) + 1)}
                            disabled={
                              updating === item?.id ||
                              (item?.quantity ?? 0) >= (item?.product?.stock ?? 0)
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(item?.id ?? '')}
                          disabled={updating === item?.id}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full sm:w-auto"
              >
                Limpar Carrinho
              </Button>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Entrega</span>
                    <span className="text-green-600">A calcular</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-red-600">R$ {subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout">
                  <Button size="lg" className="w-full bg-red-600 hover:bg-red-700">
                    Finalizar Compra
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/catalogo">
                  <Button variant="outline" size="lg" className="w-full mt-3">
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
