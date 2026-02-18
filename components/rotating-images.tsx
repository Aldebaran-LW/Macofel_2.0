'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface HeroImage {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
  active: boolean;
}

// Imagens padrão de fallback
const defaultImages = [
  'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000',
];

export default function RotatingImages() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/hero-images');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setImages(data);
        } else {
          // Usar imagens padrão se não houver imagens no banco
          setImages(
            defaultImages.map((url, index) => ({
              id: `default-${index}`,
              imageUrl: url,
              alt: `Obra de Engenharia ${index + 1}`,
              order: index,
              active: true,
            }))
          );
        }
      } else {
        // Em caso de erro, usar imagens padrão
        setImages(
          defaultImages.map((url, index) => ({
            id: `default-${index}`,
            imageUrl: url,
            alt: `Obra de Engenharia ${index + 1}`,
            order: index,
            active: true,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao buscar imagens do hero:', error);
      // Em caso de erro, usar imagens padrão
      setImages(
        defaultImages.map((url, index) => ({
          id: `default-${index}`,
          imageUrl: url,
          alt: `Obra de Engenharia ${index + 1}`,
          order: index,
          active: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHovered || images.length === 0) return; // Pausa quando hover ou se não houver imagens

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Muda a cada 3 segundos

    return () => clearInterval(interval);
  }, [isHovered, images.length]);

  return (
    <div
      className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border-l-8 border-red-600"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container para todas as imagens com animação */}
      <div className="relative w-full h-full">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          images.map((image, index) => {
            const isActive = index === currentIndex;
            const isNext = index === (currentIndex + 1) % images.length;
            const isPrev = index === (currentIndex - 1 + images.length) % images.length;

            return (
              <div
                key={image.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  isActive
                    ? 'opacity-100 scale-100 z-10'
                    : isNext || isPrev
                    ? 'opacity-0 scale-95 z-0'
                    : 'opacity-0 scale-90 z-0'
                }`}
              >
                <Image
                  src={image.imageUrl}
                  alt={image.alt}
                  fill
                  className="object-cover grayscale-[30%] brightness-75"
                  priority={isActive}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              </div>
            );
          })
        )}
      </div>

      {/* Indicadores de imagem */}
      {!loading && images.length > 0 && (
        <div className="absolute bottom-24 left-10 right-10 flex gap-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1 flex-1 transition-all ${
                index === currentIndex ? 'bg-red-600' : 'bg-white/30'
              }`}
              aria-label={`Imagem ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Texto sobreposto */}
      <div className="absolute bottom-6 left-10 right-10 z-20">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] flex-1 bg-red-600"></div>
          <span className="text-red-600 font-black text-xs uppercase tracking-widest">Especialistas</span>
        </div>
        <p className="text-white text-3xl font-black font-title leading-none uppercase italic">
          Qualidade de<br />Nível Industrial
        </p>
      </div>

      {/* Efeito de rotação sutil no container */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 right-4 w-32 h-32 border-2 border-red-600/20 rounded-full animate-spin-slow"></div>
        <div className="absolute bottom-20 left-4 w-24 h-24 border-2 border-red-600/20 rounded-full animate-spin-slow-reverse"></div>
      </div>
    </div>
  );
}
