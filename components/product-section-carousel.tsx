'use client';

import ProductsCarousel from './products-carousel';
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

interface ProductSectionCarouselProps {
  title: string;
  products: Product[];
}

export default function ProductSectionCarousel({ title, products }: ProductSectionCarouselProps) {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">{title}</h2>
        
        {products && products.length > 0 ? (
          <div className="w-full">
            <ProductsCarousel
              products={products}
              speed={65}
              gap={24}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-4">📦</p>
            <p>Nenhum produto encontrado ({products?.length ?? 0} produtos)</p>
          </div>
        )}
      </div>
    </section>
  );
}
