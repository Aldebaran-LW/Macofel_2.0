'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

interface CategoryItem {
  name: string;
  slug: string;
  image: string;
  color: string;
}

interface CategoriesInlineCarouselProps {
  categories: CategoryItem[];
}

export default function CategoriesInlineCarousel({ categories }: CategoriesInlineCarouselProps) {
  const categoryItems = useMemo(
    () =>
      categories.map((category) => (
        <Link
          key={category.slug}
          href={`/catalogo?category=${category.slug}`}
          className="group relative w-[240px] md:w-[280px] shrink-0 overflow-hidden rounded-[1.75rem] aspect-[16/10] shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
        >
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 70vw, 280px"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${category.color} via-black/25 to-transparent opacity-90 group-hover:opacity-80 transition-opacity`}
          />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-base font-black tracking-tight leading-tight">{category.name}</p>
            <div className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75 group-hover:text-white transition-colors">
              Ver categoria <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      )),
    [categories]
  );

  if (categories.length === 0) return null;

  return (
    <div className="mt-8 md:mt-10">
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="categories-inline-track-moving flex w-max gap-4 py-2 hover:[animation-play-state:paused]">
          <div className="flex gap-4 shrink-0">{categoryItems}</div>
          <div className="flex gap-4 shrink-0" aria-hidden="true">
            {categoryItems}
          </div>
        </div>
      </div>
    </div>
  );
}
