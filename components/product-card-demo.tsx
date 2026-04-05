'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { publicCategoryLabel } from '@/lib/category-display';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  /** Preço a prazo (import LW / admin); opcional */
  pricePrazo?: number | null;
  imageUrl?: string | null;
  category?: {
    name: string;
  } | null;
  featured?: boolean;
  stock?: number;
}

interface ProductCardDemoProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: 'green' | 'red' | 'yellow';
}

export default function ProductCardDemo({ 
  product, 
  showBadge = false, 
  badgeText = 'Novo',
  badgeColor = 'green' 
}: ProductCardDemoProps) {
  const { data: session } = useSession() ?? {};
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const categoryLabel = publicCategoryLabel(product.category?.name);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (res.ok) {
        toast.success('Produto adicionado ao carrinho!');
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao adicionar ao carrinho');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao adicionar ao carrinho');
    } finally {
      setAdding(false);
    }
  };

  const badgeColors = {
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-500',
  };

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="product-card bg-white rounded-2xl border border-slate-100 overflow-hidden relative"
    >
      <div className="aspect-square bg-slate-50 p-8 flex items-center justify-center relative overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain mix-blend-multiply"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-slate-300 text-4xl">📦</div>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-4 right-4 text-slate-300 hover:text-red-600 transition-colors z-10"
        >
          <Heart className="w-5 h-5" />
        </button>
        {showBadge && (
          <div className={`absolute top-4 left-4 ${badgeColors[badgeColor]} text-white px-2 py-1 rounded text-[8px] font-bold uppercase z-10`}>
            {badgeText}
          </div>
        )}
        {product.stock !== undefined && product.stock > 0 && (
          <div className="absolute bottom-4 left-4 badge-pickup px-2 py-1 rounded text-[8px] font-bold uppercase z-10">
            Disponível em Loja
          </div>
        )}
      </div>
      <div className="p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
          {categoryLabel || 'Geral'}
        </p>
        <h3 className="text-sm font-bold h-10 overflow-hidden line-clamp-2 mb-4">
          {product.name}
        </h3>
        <div className="space-y-1 mb-6">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase text-slate-400">À vista</span>
            <span className="text-xl font-black text-slate-900">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
          {product.pricePrazo != null &&
            product.pricePrazo > 0 &&
            Number.isFinite(product.pricePrazo) && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-slate-400">A prazo</span>
                <span className="text-base font-bold text-slate-700">
                  R$ {product.pricePrazo.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {adding ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <>
              <Plus className="w-4 h-4" /> Adicionar
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
