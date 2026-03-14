'use client';

import ProductsCarousel from './products-carousel';
import ScrollAnimate from './scroll-animate';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

interface FeaturedProductsCarouselProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  speed?: number;
}

export default function FeaturedProductsCarousel({
  products,
  title = 'Produtos em Destaque',
  subtitle = 'Selecionados para Você',
  speed = 50,
}: FeaturedProductsCarouselProps) {
  const badges = [
    { text: 'Mais Vendido', color: 'red' as const },
    { text: 'Destaque', color: 'amber' as const },
    { text: 'Novo', color: 'green' as const },
  ];

  return (
    <ScrollAnimate animation="fade-up">
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
              {subtitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
              {title.split(' ').slice(0, -1).join(' ')}
              <br />
              <span className="text-red-600">{title.split(' ').slice(-1)[0]}</span>
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="hidden md:flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl transition-all"
          >
            Ver Todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ProductsCarousel
          products={products}
          speed={speed}
          gap={24}
          badgeText={badges[0]?.text}
          badgeColor={badges[0]?.color}
        />

        <div className="flex justify-center mt-10 md:hidden">
          <Link
            href="/catalogo"
            className="flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 px-8 py-3 rounded-xl"
          >
            Ver Todos os Produtos
          </Link>
        </div>
      </section>
    </ScrollAnimate>
  );
}
