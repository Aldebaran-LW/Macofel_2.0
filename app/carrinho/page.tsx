'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { DIRECT_CHECKOUT_ENABLED } from '@/lib/sales-mode';
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
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteShippingCep, setQuoteShippingCep] = useState('');
  const [quoteShippingCityState, setQuoteShippingCityState] = useState('');
  const [quoteRequestShipping, setQuoteRequestShipping] = useState(true);
  const [quoteRequestPixDiscount, setQuoteRequestPixDiscount] = useState(true);
  const [quoteSending, setQuoteSending] = useState(false);

  const resetQuoteForm = () => {
    setQuoteMessage('');
    setQuoteShippingCep('');
    setQuoteShippingCityState('');
    setQuoteRequestShipping(true);
    setQuoteRequestPixDiscount(true);
  };

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
      const res = await fetch('/api/cart', { credentials: 'include' });
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
        credentials: 'include',
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
        credentials: 'include',
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

  const sendQuoteRequest = async () => {
    const items = cart?.items ?? [];
    if (items.length === 0) {
      toast.error('Adicione produtos ao carrinho primeiro');
      return;
    }
    try {
      setQuoteSending(true);
      const payload = {
        message: quoteMessage.trim() || null,
        shippingCep: quoteShippingCep.trim() || null,
        shippingCityState: quoteShippingCityState.trim() || null,
        requestShippingQuote: quoteRequestShipping,
        requestPixDiscount: quoteRequestPixDiscount,
        items: items.map((item) => ({
          productId: item.product?.id,
          name: item.product?.name,
          slug: item.product?.slug,
          quantity: item.quantity,
          price: item.product?.price,
        })),
      };
      const res = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao enviar');
      }
      toast.success('Solicitação enviada! Entraremos em contato em breve.');
      setQuoteOpen(false);
      resetQuoteForm();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao enviar solicitação');
    } finally {
      setQuoteSending(false);
    }
  };

  const clearCart = async () => {
    if (!confirm('Deseja realmente limpar o carrinho?')) return;

    try {
      const res = await fetch('/api/cart', { method: 'DELETE', credentials: 'include' });
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lista para orçamento</h1>
          <p className="text-gray-600 text-sm mt-2 max-w-2xl">
            Monte a lista de materiais com quantidades. Envie a solicitação e a MACOFEL responde com
            condições comerciais.{' '}
            {!DIRECT_CHECKOUT_ENABLED && (
              <span className="text-gray-500">
                Compra com pagamento online ficará disponível numa fase seguinte.
              </span>
            )}
          </p>
        </div>

        {isEmpty ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione produtos ao catálogo para montar a sua lista e solicitar um orçamento.
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
                <h2 className="text-xl font-bold mb-4">Resumo (referência)</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Valores do catálogo para referência; o orçamento oficial será tratado pela equipe.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal referência</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Entrega</span>
                    <span className="text-amber-700">No orçamento</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total referência</span>
                    <span className="text-red-600">R$ {subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setQuoteOpen(true)}
                >
                  <Send className="mr-2 h-5 w-5" />
                  Solicitar orçamento destes itens
                </Button>

                <Link href="/catalogo">
                  <Button variant="outline" size="lg" className="w-full mt-3">
                    Continuar a montar a lista
                  </Button>
                </Link>

                {DIRECT_CHECKOUT_ENABLED && (
                  <Link href="/checkout" className="block mt-3">
                    <Button size="lg" className="w-full bg-red-600 hover:bg-red-700">
                      Finalizar compra
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog
        open={quoteOpen}
        onOpenChange={(open) => {
          setQuoteOpen(open);
          if (!open) resetQuoteForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar orçamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Envie a lista para nossa equipe. Inclua CEP e cidade se quiser{' '}
            <strong>valor de frete</strong> e marque se deseja <strong>condições de desconto</strong>{' '}
            (ex.: PIX ou à vista) no retorno.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-cep">CEP (entrega)</Label>
              <Input
                id="quote-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={quoteShippingCep}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 8);
                  const fmt =
                    d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
                  setQuoteShippingCep(fmt);
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="quote-cidade">Cidade / UF ou referência de entrega</Label>
              <Input
                id="quote-cidade"
                placeholder="Ex.: Parapuã - SP"
                value={quoteShippingCityState}
                onChange={(e) => setQuoteShippingCityState(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="quote-frete"
                checked={quoteRequestShipping}
                onCheckedChange={(v) => setQuoteRequestShipping(v === true)}
              />
              <div className="grid gap-1">
                <Label htmlFor="quote-frete" className="font-normal cursor-pointer">
                  Quero incluir <strong>custo de envio / frete</strong> no orçamento
                </Label>
                <p className="text-xs text-gray-500">
                  Informe o CEP acima para facilitar o cálculo.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="quote-pix"
                checked={quoteRequestPixDiscount}
                onCheckedChange={(v) => setQuoteRequestPixDiscount(v === true)}
              />
              <Label htmlFor="quote-pix" className="font-normal cursor-pointer leading-snug">
                Quero saber sobre <strong>desconto</strong> (ex.: PIX, pagamento à vista ou outras formas)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-msg">Observações (opcional)</Label>
            <Textarea
              id="quote-msg"
              placeholder="Prazo desejado, quantidades alternativas, horário para contato…"
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuoteOpen(false);
                resetQuoteForm();
              }}
              disabled={quoteSending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void sendQuoteRequest()}
              disabled={quoteSending || (cart?.items?.length ?? 0) === 0}
            >
              {quoteSending ? 'Enviando…' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
