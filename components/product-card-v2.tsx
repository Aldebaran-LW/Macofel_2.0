'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Eye, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
  category?: { name: string } | null;
  featured?: boolean;
  stock?: number;
  originalPrice?: number;
}

interface ProductCardV2Props {
  product: Product;
  badgeText?: string;
  badgeColor?: 'red' | 'green' | 'amber' | 'blue';
  priority?: boolean;
}

export default function ProductCardV2({
  product,
  badgeText,
  badgeColor = 'red',
  priority = false,
}: ProductCardV2Props) {
  const { data: session } = useSession() ?? {};
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [wished, setWished] = useState(false);

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const inStock = (product.stock ?? 0) > 0;

  const badgeClasses = {
    red: 'bg-red-600 text-white',
    green: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-600 text-white',
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast.error('Faça login para adicionar ao carrinho');
      router.push('/login');
      return;
    }

    if (!inStock) {
      toast.error('Produto fora de estoque');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (res.ok) {
        toast.success('Adicionado ao carrinho! 🛒');
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

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWished(!wished);
    toast.success(wished ? 'Removido dos favoritos' : 'Adicionado aos favoritos ❤️');
  };

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-1"
    >
      {/* Image Area */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority={priority}
            className="object-contain mix-blend-multiply p-4 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-5xl opacity-20">📦</div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {badgeText && (
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badgeClasses[badgeColor]}`}
            >
              {badgeText}
            </span>
          )}
          {discount && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
              -{discount}%
            </span>
          )}
          {!inStock && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-500">
              Esgotado
            </span>
          )}
        </div>

        {/* Wish button */}
        <button
          onClick={handleWish}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Favoritar"
        >
          <Heart
            className={`w-4 h-4 transition-all ${wished ? 'fill-red-600 text-red-600 scale-110' : 'text-slate-300'}`}
          />
        </button>

        {/* Hover overlay: quick actions */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleAddToCart}
            disabled={adding || !inStock}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-red-600 text-white text-[11px] font-bold uppercase py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                {inStock ? 'Adicionar' : 'Esgotado'}
              </>
            )}
          </button>
          <Link
            href={`/produto/${product.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="w-10 flex items-center justify-center bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category */}
        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5">
          {product.category?.name ?? 'Geral'}
        </p>

        {/* Name */}
        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-3 flex-1 group-hover:text-red-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating placeholder */}
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
          <span className="text-[10px] text-slate-400 ml-1">(12)</span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="text-[11px] text-slate-400 line-through">
                R$ {product.originalPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
            <p className="text-xl font-black text-slate-900">
              R${' '}
              <span className="text-red-600">
                {product.price.toFixed(2).replace('.', ',')}
              </span>
            </p>
            <p className="text-[10px] text-slate-400">
              ou 12x de R$ {(product.price / 12).toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Stock indicator */}
          {inStock && (
            <div className="shrink-0 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Em estoque</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
