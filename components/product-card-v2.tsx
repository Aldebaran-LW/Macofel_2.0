'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { isFavoriteProduct, toggleFavoriteProduct } from '@/lib/client-favorites';

const MotionLink = motion(Link);

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  pricePrazo?: number | null;
  showInstallmentsOnStore?: boolean;
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
  secondaryImageUrl?: string | null;
}

export default function ProductCardV2({
  product,
  badgeText,
  badgeColor = 'red',
  priority = false,
  secondaryImageUrl,
}: ProductCardV2Props) {
  const { data: session, status } = useSession() ?? {};
  const router = useRouter();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? '';
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsFavorite(false);
      return;
    }
    setIsFavorite(isFavoriteProduct(userId, product.id));
  }, [userId, product.id]);

  const pixPrice = (product.price * 0.9).toFixed(2).replace('.', ',');
  const installment = (product.price / 12).toFixed(2).replace('.', ',');
  const hasPrazo =
    product.pricePrazo != null && product.pricePrazo > 0 && Number.isFinite(product.pricePrazo);

  const hasSecondaryImage = Boolean(secondaryImageUrl && secondaryImageUrl !== product.imageUrl);

  return (
    <MotionLink
      href={`/produto/${product.slug}`}
      scroll
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group cursor-pointer text-left"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        y: -10,
        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      {/* Imagem */}
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50">
        <button
          type="button"
          title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (status !== 'authenticated' || !userId) {
              toast.error('Faça login para usar favoritos');
              router.push('/login');
              return;
            }
            const added = toggleFavoriteProduct(userId, product.id);
            setIsFavorite(added);
            toast.success(added ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
          }}
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-500 shadow-sm backdrop-blur-[2px] transition-colors hover:border-red-200 hover:bg-white hover:text-red-600"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-red-600 text-red-600' : 'text-slate-400'}`} />
        </button>
        {product.imageUrl ? (
          <>
            {/* Imagem Principal */}
            <motion.div
              className="absolute inset-0"
              animate={{
                opacity: hasSecondaryImage && isHovered ? 0 : 1,
                scale: isHovered ? 1.15 : 1,
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 50vw, 25vw"
                priority={priority}
              />
            </motion.div>

            {/* Imagem Secundária (Image Swap) */}
            {hasSecondaryImage && (
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: isHovered ? 1 : 0,
                  scale: isHovered ? 1.15 : 1.02,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={secondaryImageUrl!}
                  alt={`${product.name} - Vista alternativa`}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </motion.div>
            )}
          </>
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

      {/* Preço */}
      <div className="mb-4 space-y-1">
        {hasPrazo ? (
          <>
            <p className="text-lg font-black text-gray-900">
              À vista R$ {product.price.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-base font-bold text-emerald-700">
              A prazo R$ {product.pricePrazo!.toFixed(2).replace('.', ',')}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-black text-emerald-600">
              R$ {pixPrice} <span className="text-sm font-bold">no PIX</span>
            </p>
            {product.showInstallmentsOnStore === true && (
              <p className="text-xs text-gray-500">
                12x de R$ {installment} no cartão s/ juros
              </p>
            )}
          </>
        )}
      </div>

      {/* CTA — mesmo destino que o cartão inteiro */}
      <span className="block w-full bg-emerald-600 group-hover:bg-emerald-700 text-white text-center font-bold py-3 rounded-lg transition-colors">
        Comprar
      </span>
    </MotionLink>
  );
}
