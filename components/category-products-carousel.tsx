'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
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

interface CategoryProductsCarouselProps {
  products: Product[];
}

export default function CategoryProductsCarousel({
  products,
}: CategoryProductsCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [loopWidth, setLoopWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const duplicatedProducts = useMemo(() => [...products, ...products], [products]);

  useEffect(() => {
    if (!trackRef.current || typeof ResizeObserver === 'undefined') return;

    const updateLoopWidth = () => {
      const width = trackRef.current?.scrollWidth ?? 0;
      setLoopWidth(width / 2);
      x.set(0);
    };

    updateLoopWidth();

    const resizeObserver = new ResizeObserver(() => updateLoopWidth());
    resizeObserver.observe(trackRef.current);
    window.addEventListener('resize', updateLoopWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLoopWidth);
    };
  }, [products, x]);

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || paused || loopWidth === 0) return;

    const distance = (65 * delta) / 1000;
    const next = x.get() - distance;
    x.set(next <= -loopWidth ? next + loopWidth : next);
  });

  if (products.length === 0) return null;

  return (
    <div
      className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div ref={trackRef} style={{ x }} className="flex w-max gap-3 sm:gap-4 md:gap-6 py-2">
        {duplicatedProducts.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="w-[160px] xs:w-[180px] sm:w-[200px] md:w-[210px] lg:w-[233px] xl:w-[240px] shrink-0"
          >
            <ProductCardV2
              product={product}
              priority={index < 4}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
