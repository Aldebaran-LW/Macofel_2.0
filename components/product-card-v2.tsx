'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
  secondaryImageUrl?: string | null;
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

  const pixPrice = (product.price * 0.9).toFixed(2).replace('.', ',');
  const installment = (product.price / 12).toFixed(2).replace('.', ',');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group">
      {/* Imagem */}
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 50vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-5xl">📦</span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[40px]">
        {product.name}
      </h3>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">(0)</span>
      </div>

      {/* Preço */}
      <div className="mb-4">
        <p className="text-xl font-black text-emerald-600">
          R$ {pixPrice} <span className="text-sm font-bold">no PIX</span>
        </p>
        <p className="text-xs text-gray-500">
          12x de R$ {installment} no cartão s/ juros
        </p>
      </div>

      {/* Botão Comprar */}
      <Link
        href={`/produto/${product.slug}`}
        className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold py-3 rounded-lg transition-colors"
      >
        Comprar
      </Link>
    </div>
  );
}
