'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';

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
  const [isHovered, setIsHovered] = useState(false);
  const pixPrice = (product.price * 0.9).toFixed(2).replace('.', ',');
  const installment = (product.price / 12).toFixed(2).replace('.', ',');
  const hasPrazo =
    product.pricePrazo != null && product.pricePrazo > 0 && Number.isFinite(product.pricePrazo);

  const hasSecondaryImage = Boolean(secondaryImageUrl && secondaryImageUrl !== product.imageUrl);

  return (
    <motion.div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group"
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

      {/* Botão Comprar */}
      <Link
        href={`/produto/${product.slug}`}
        className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold py-3 rounded-lg transition-colors"
      >
        Comprar
      </Link>
    </motion.div>
  );
}
