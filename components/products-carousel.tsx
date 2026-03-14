'use client';

import InfiniteCarousel from './infinite-carousel';
import ProductCardV2 from './product-card-v2';

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

interface ProductsCarouselProps {
  products: Product[];
  speed?: number;
  gap?: number;
  badgeText?: string | string[];
  badgeColor?: 'red' | 'green' | 'amber' | 'blue' | ('red' | 'green' | 'amber' | 'blue')[];
}

export default function ProductsCarousel({
  products,
  speed = 65,
  gap = 24,
  badgeText,
  badgeColor = 'red',
}: ProductsCarouselProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📦</div>
        <p className="font-bold">Nenhum produto encontrado.</p>
      </div>
    );
  }

  const getBadgeText = (index: number): string | undefined => {
    if (!badgeText) return undefined;
    if (Array.isArray(badgeText)) {
      return badgeText[index] || undefined;
    }
    return index < 3 ? badgeText : undefined;
  };

  const getBadgeColor = (index: number): 'red' | 'green' | 'amber' | 'blue' => {
    if (Array.isArray(badgeColor)) {
      return badgeColor[index] || 'red';
    }
    return badgeColor;
  };

  return (
    <InfiniteCarousel speed={speed} gap={gap} direction="left">
      {products.map((product, index) => (
        <div
          key={`${product.id}-${index}`}
          className="w-[200px] sm:w-[224px] lg:w-[248px] xl:w-[256px] shrink-0"
        >
          <ProductCardV2
            product={product}
            badgeText={getBadgeText(index)}
            badgeColor={getBadgeColor(index)}
            priority={index < 4}
          />
        </div>
      ))}
    </InfiniteCarousel>
  );
}
