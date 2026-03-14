'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSlide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  text?: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  autoPlayInterval?: number; // em milissegundos
}

export default function HeroCarousel({ 
  slides, 
  autoPlayInterval = 5000 
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Retoma auto-play após 10s
  };

  const goToPrevious = () => {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % slides.length);
  };

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[250px] sm:h-[300px] md:h-[400px] lg:h-[500px]">
        {/* Imagem de fundo */}
        <Image
          src={currentSlide.image}
          alt={currentSlide.title || 'Banner'}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

        {/* Conteúdo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 relative z-10 h-full flex items-center">
          <div className="text-white max-w-full">
            {currentSlide.subtitle && (
              <p className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider mb-1 sm:mb-2 text-yellow-300">
                {currentSlide.subtitle}
              </p>
            )}
            {currentSlide.title && (
              <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-2 sm:mb-4 tracking-tight leading-tight">
                {currentSlide.title}
              </h1>
            )}
            {currentSlide.text && (
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 max-w-2xl leading-snug">
                {currentSlide.text}
              </p>
            )}
          </div>
        </div>

        {/* Botões de navegação */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all touch-manipulation"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all touch-manipulation"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Indicadores */}
        {slides.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 sm:h-2 rounded-full transition-all touch-manipulation ${
                  index === currentIndex
                    ? 'bg-white w-6 sm:w-8'
                    : 'bg-white/50 w-1.5 sm:w-2 hover:bg-white/75'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
