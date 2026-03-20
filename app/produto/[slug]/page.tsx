'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart,
  Minus,
  Plus,
  Package,
  Tag,
  ChevronRight,
  Star,
  Shield,
  Truck,
  RotateCcw,
  Share2,
  Heart,
  CheckCircle2,
  Clock,
  Phone,
} from 'lucide-react';
import HeaderMobile from '@/components/header-mobile';
import StoreTopBar from '@/components/store-top-bar';
import StoreFooter from '@/components/store-footer';
import StoreWhatsAppFloat from '@/components/store-whatsapp-float';
import StoreServiceBadges from '@/components/store-service-badges';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: { name: string; slug: string };
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() ?? {};
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [wished, setWished] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'delivery'>('desc');

  useEffect(() => {
    if (params?.slug) fetchProduct();
  }, [params?.slug]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params?.slug}`);
      if (res.ok) {
        setProduct(await res.json());
      } else {
        toast.error('Produto não encontrado');
        router.push('/catalogo');
      }
    } catch {
      toast.error('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!session?.user) {
      toast.error('Faça login para adicionar ao carrinho');
      router.push('/login');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product?.id, quantity }),
      });
      if (res.ok) {
        toast.success(`${quantity}x adicionado ao carrinho! 🛒`);
        router.push('/carrinho');
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao adicionar');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setAdding(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado! 📋');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <StoreTopBar />
        <HeaderMobile />
        <StoreServiceBadges />
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="skeleton aspect-square rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-4 w-1/4 rounded-lg" />
              <div className="skeleton h-10 w-3/4 rounded-xl" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-28 w-full rounded-xl" />
              <div className="skeleton h-14 w-1/3 rounded-xl" />
              <div className="skeleton h-16 w-full rounded-2xl" />
            </div>
          </div>
        </div>
        <StoreFooter />
        <StoreWhatsAppFloat />
      </div>
    );
  }

  if (!product) return null;

  const isOutOfStock = (product?.stock ?? 0) === 0;
  const installment = (product.price / 12).toFixed(2).replace('.', ',');

  return (
    <div className="min-h-screen bg-white">
      <StoreTopBar />
      <HeaderMobile />

      <StoreServiceBadges />

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
          <Link href="/" className="hover:text-red-600 transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/catalogo" className="hover:text-red-600 transition-colors">Catálogo</Link>
          <ChevronRight className="w-3 h-3" />
          <Link
            href={`/catalogo?category=${product?.category?.slug}`}
            className="hover:text-red-600 transition-colors"
          >
            {product?.category?.name}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 line-clamp-1">{product?.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16">
          {/* ── IMAGE ───────────────────────── */}
          <div className="space-y-4">
            <div className="relative bg-slate-50 rounded-3xl overflow-hidden aspect-square border border-slate-100">
              {product?.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product?.name ?? 'Produto'}
                  fill
                  className="object-contain p-8"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-24 w-24 text-slate-200" />
                </div>
              )}

              {/* Badge stock */}
              {!isOutOfStock && (
                <div className="absolute top-5 left-5 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
                  Em Estoque
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute top-5 left-5 bg-slate-300 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
                  Esgotado
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-5 right-5 flex flex-col gap-2">
                <button
                  onClick={() => { setWished(!wished); toast.success(wished ? 'Removido' : 'Adicionado aos favoritos ❤️'); }}
                  className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${wished ? 'fill-red-600 text-red-600' : 'text-slate-400'}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* ── DETAILS ─────────────────────── */}
          <div className="flex flex-col">
            {/* Category & Name */}
            <div className="mb-6">
              <Link
                href={`/catalogo?category=${product?.category?.slug}`}
                className="flex items-center gap-2 text-xs font-black text-red-600 uppercase tracking-widest mb-3 hover:underline"
              >
                <Tag className="w-3.5 h-3.5" />
                {product?.category?.name}
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">
                {product?.name}
              </h1>

              {/* Rating placeholder */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-sm text-slate-400 font-medium">4.0 (12 avaliações)</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-100">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl md:text-5xl font-black text-slate-900">
                  R$ <span className="text-red-600">{product?.price?.toFixed?.(2).replace('.', ',')}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>ou <strong className="text-slate-700">12x</strong> de <strong className="text-slate-700">R$ {installment}</strong> sem juros</span>
                <span className="text-emerald-600 font-bold">5% off no PIX</span>
              </div>
            </div>

            {/* Stock info */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                {isOutOfStock
                  ? 'Produto indisponível no momento'
                  : `${product?.stock} unidades disponíveis em estoque`}
              </span>
            </div>

            {/* Quantity + Add to Cart */}
            {!isOutOfStock && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-black text-lg">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product?.stock ?? 1, quantity + 1))}
                        disabled={quantity >= (product?.stock ?? 1)}
                        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-slate-400">
                      Total:{' '}
                      <strong className="text-slate-900">
                        R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-base uppercase tracking-wider py-5 rounded-2xl transition-all hover:shadow-xl hover:shadow-red-600/20 disabled:opacity-60 active:scale-[0.99]"
                >
                  {adding ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Adicionar à lista
                    </>
                  )}
                </button>

                <a
                  href="https://wa.me/5518998145495"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-sm uppercase tracking-wider py-4 rounded-2xl transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Comprar via WhatsApp
                </a>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Truck className="w-4 h-4 text-red-600" />, text: 'Entrega em 24-48h' },
                { icon: <Shield className="w-4 h-4 text-red-600" />, text: 'Compra Segura' },
                { icon: <RotateCcw className="w-4 h-4 text-red-600" />, text: 'Troca em 30 dias' },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  {b.icon}
                  <span className="text-[10px] font-bold text-slate-600 leading-tight">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABS ───────────────────────────── */}
        <div className="mb-16">
          <div className="flex gap-1 border-b border-slate-200 mb-8">
            {[
              { id: 'desc', label: 'Descrição' },
              { id: 'specs', label: 'Especificações' },
              { id: 'delivery', label: 'Entrega & Devolução' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'desc' && (
            <div className="max-w-3xl">
              <p className="text-slate-600 leading-relaxed text-base">{product?.description}</p>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl">
              <div className="rounded-2xl overflow-hidden border border-slate-100">
                {[
                  { label: 'Categoria', value: product?.category?.name },
                  { label: 'Código do produto', value: product?.id?.slice(0, 8).toUpperCase() },
                  { label: 'Disponibilidade', value: isOutOfStock ? 'Esgotado' : `${product?.stock} un. em estoque` },
                  { label: 'Garantia', value: 'Garantia de fábrica conforme fabricante' },
                ].map((row, i) => (
                  <div key={i} className={`flex gap-4 px-6 py-4 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                    <span className="w-40 shrink-0 text-xs font-black uppercase tracking-wider text-slate-400">
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="max-w-2xl space-y-4">
              {[
                {
                  icon: <Truck className="w-5 h-5 text-red-600" />,
                  title: 'Entrega Expressa',
                  desc: 'Para São Paulo capital e Grande SP: entrega em 24h úteis após confirmação do pagamento.',
                },
                {
                  icon: <Clock className="w-5 h-5 text-red-600" />,
                  title: 'Outras Regiões',
                  desc: 'Para demais regiões, prazo de 3 a 7 dias úteis via transportadora parceira com rastreamento.',
                },
                {
                  icon: <RotateCcw className="w-5 h-5 text-red-600" />,
                  title: 'Política de Devolução',
                  desc: 'Trocas e devoluções aceitas em até 30 dias após o recebimento. Produto deve estar sem uso e na embalagem original.',
                },
                {
                  icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
                  title: 'Click & Collect',
                  desc: 'Retire na nossa loja física na Av. São Paulo, 699 - Centro, Parapuã - SP, 17730-000 em até 2 horas após a compra.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">{item.title}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RELATED CTA ──────────────────── */}
        <div className="bg-slate-950 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-3">
              Precisa de mais?
            </p>
            <h3 className="text-2xl font-black text-white italic">
              Explore o Catálogo Completo
            </h3>
          </div>
          <Link
            href="/catalogo"
            className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all text-sm uppercase tracking-wider"
          >
            Ver Todos os Produtos
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <StoreFooter />
      <StoreWhatsAppFloat />
    </div>
  );
}
