'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Phone } from 'lucide-react';

interface HeroImage {
  id: string;
  imageUrl: string;
  alt: string;
  displayType: 'grid' | 'large';
  animationOrder: number;
  linkType?: 'product' | 'category' | 'url' | null;
  productId?: string | null;
  categorySlug?: string | null;
  linkUrl?: string | null;
}

export default function HeroSectionAnimated() {
  const [gridImages, setGridImages] = useState<HeroImage[]>([]);
  const [largeImages, setLargeImages] = useState<HeroImage[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<'grid' | 'large'>('grid');
  const [currentLargeIndex, setCurrentLargeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productSlugMap, setProductSlugMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchHeroImages();
    fetchProductSlugs();
  }, []);

  const fetchProductSlugs = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        data.products?.forEach((product: any) => {
          if (product.id && product.slug) {
            map[product.id] = product.slug;
          }
        });
        setProductSlugMap(map);
      }
    } catch (error) {
      console.error('Erro ao buscar slugs dos produtos:', error);
    }
  };

  useEffect(() => {
    if (gridImages.length === 0 && largeImages.length === 0) return;

    // Alternar entre grid e large a cada 5 segundos
    const interval = setInterval(() => {
      if (currentDisplay === 'grid' && largeImages.length > 0) {
        setCurrentDisplay('large');
        setCurrentLargeIndex(0);
      } else if (currentDisplay === 'large') {
        setCurrentDisplay('grid');
      }
    }, 5000);

    // Alternar entre imagens large a cada 4 segundos
    if (currentDisplay === 'large' && largeImages.length > 1) {
      const largeInterval = setInterval(() => {
        setCurrentLargeIndex((prev) => (prev + 1) % largeImages.length);
      }, 4000);
      return () => {
        clearInterval(interval);
        clearInterval(largeInterval);
      };
    }

    return () => clearInterval(interval);
  }, [currentDisplay, gridImages.length, largeImages.length]);

  const fetchHeroImages = async () => {
    try {
      const res = await fetch('/api/hero-images');
      if (res.ok) {
        const data = await res.json();
        setGridImages(data.grid || []);
        setLargeImages(data.large || []);
      }
    } catch (error) {
      console.error('Erro ao buscar imagens do hero:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageLink = (image: HeroImage) => {
    if (image.linkType === 'product' && image.productId) {
      const slug = productSlugMap[image.productId];
      if (slug) {
        return `/produto/${slug}`;
      }
      // Fallback: tentar com ID (pode não funcionar se a rota exigir slug)
      return null;
    }
    if (image.linkType === 'category' && image.categorySlug) {
      return `/catalogo?category=${image.categorySlug}`;
    }
    if (image.linkType === 'url' && image.linkUrl) {
      return image.linkUrl;
    }
    return null;
  };

  const renderImage = (image: HeroImage, aspectRatio: string, className: string = '') => {
    const link = getImageLink(image);
    const imageElement = (
      <div className={`relative overflow-hidden group border-0 ${className} ${aspectRatio || 'aspect-square'} bg-gradient-to-br from-slate-100 to-slate-200`}>
        <Image
          src={image.imageUrl}
          alt={image.alt}
          fill
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-700"
          sizes="25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
        {image.alt && (
          <div className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider z-10">
            {image.alt}
          </div>
        )}
      </div>
    );

    if (link) {
      return (
        <Link href={link} key={image.id}>
          {imageElement}
        </Link>
      );
    }

    return <div key={image.id}>{imageElement}</div>;
  };

  // Se não houver imagens, mostrar layout padrão
  if (loading || (gridImages.length === 0 && largeImages.length === 0)) {
    return (
      <section className="hero-v2-bg relative overflow-hidden min-h-[88vh] flex items-center">
        <div className="hero-v2-accent absolute inset-0 pointer-events-none" />
        <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 w-full py-20 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in">
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/30 text-red-400 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest mb-8">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Campanha — Inverno 2026
              </div>
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-8 italic uppercase">
                Construa com
                <br />
                <span className="text-red-500">Confiança.</span>
              </h1>
              <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-lg mb-10">
                Mais de 5.000 produtos em estoque — cimento, ferramentas, elétrica, hidráulica e muito mais. Entrega direta na sua obra em até 48h.
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  href="/catalogo"
                  className="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-red-600/30 hover:-translate-y-0.5 text-sm uppercase tracking-wider"
                >
                  Ver Catálogo Completo
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="tel:+551133333333"
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all border border-white/10 text-sm uppercase tracking-wider"
                >
                  <Phone className="w-4 h-4" />
                  Falar com Consultor
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-v2-bg relative overflow-hidden min-h-[88vh] flex items-center">
      <div className="hero-v2-accent absolute inset-0 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 w-full py-20 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="animate-slide-in">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/30 text-red-400 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Campanha — Inverno 2026
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-8 italic uppercase">
              Construa com
              <br />
              <span className="text-red-500">Confiança.</span>
            </h1>

            <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-lg mb-10">
              Mais de 5.000 produtos em estoque — cimento, ferramentas, elétrica, hidráulica e muito mais. Entrega direta na sua obra em até 48h.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                href="/catalogo"
                className="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-red-600/30 hover:-translate-y-0.5 text-sm uppercase tracking-wider"
              >
                Ver Catálogo Completo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:+551133333333"
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all border border-white/10 text-sm uppercase tracking-wider"
              >
                <Phone className="w-4 h-4" />
                Falar com Consultor
              </a>
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
              {['✓ Desde 1998', '✓ +10.000 Clientes', '✓ 5.000m² de Estoque', '✓ Garantia Técnica'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right: Animated Images */}
          <div className="hidden lg:block relative min-h-[500px]">
            {/* Grid Display */}
            {currentDisplay === 'grid' && gridImages.length > 0 && (
              <div
                className="grid grid-cols-2 gap-4 animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                <div className="space-y-4">
                  {gridImages.slice(0, 2).map((img, idx) => renderImage(img, 'aspect-square', ''))}
                </div>
                <div className="space-y-4 mt-8">
                  {gridImages.slice(2, 4).map((img, idx) => renderImage(img, 'aspect-square', ''))}
                </div>
              </div>
            )}

            {/* Large Display */}
            {currentDisplay === 'large' && largeImages.length > 0 && (
              <div
                className="absolute inset-0 animate-fade-in"
                key={largeImages[currentLargeIndex]?.id}
              >
                {renderImage(largeImages[currentLargeIndex], 'aspect-square', 'h-full w-full')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60H1440V20C1200 60 960 0 720 20C480 40 240 0 0 20V60Z" fill="#f9fafb" />
        </svg>
      </div>
    </section>
  );
}
