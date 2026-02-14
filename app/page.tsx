import Link from 'next/link';
import Image from 'next/image';
import { Package, Truck, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientLayoutWrapper from '@/components/client-layout-wrapper';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true },
      include: { category: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });
    return products ?? [];
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <ClientLayoutWrapper>
      <section className="relative bg-gradient-to-r from-red-600 to-red-800 text-white py-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Tudo para sua <span className="text-yellow-300">Construção</span>
            </h1>
            <p className="text-xl mb-8 text-red-50">
              Materiais de qualidade, preços competitivos e entrega rápida para sua obra.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/catalogo">
                <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100">
                  <Package className="mr-2 h-5 w-5" />
                  Ver Catálogo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Amplo Catálogo</h3>
              <p className="text-gray-600 text-sm">Milhares de produtos para sua obra</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Qualidade Garantida</h3>
              <p className="text-gray-600 text-sm">Produtos certificados e de marcas confiáveis</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Entrega Rápida</h3>
              <p className="text-gray-600 text-sm">Receba seus materiais no prazo</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Atendimento Rápido</h3>
              <p className="text-gray-600 text-sm">Suporte dedicado para você</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Produtos em Destaque</h2>
            <p className="text-gray-600">Confira alguns dos nossos produtos mais procurados</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts?.map?.((product: any) => (
              <Link
                key={product?.id}
                href={`/produto/${product?.slug}`}
                className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100">
                  {product?.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product?.name ?? 'Produto'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-red-600 font-medium">
                    {product?.category?.name}
                  </span>
                  <h3 className="font-semibold text-lg mt-1 mb-2 line-clamp-2">
                    {product?.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-600">
                      R$ {product?.price?.toFixed?.(2)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {(product?.stock ?? 0) > 0 ? (
                        <span className="text-green-600">Em estoque</span>
                      ) : (
                        <span className="text-red-600">Indisponível</span>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/catalogo">
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                Ver Todos os Produtos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </ClientLayoutWrapper>
  );
}
