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
      <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-24 md:py-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                Tudo para sua{' '}
                <span className="text-yellow-300 drop-shadow-lg animate-pulse">Construção</span>
              </h1>
              <p className="text-xl md:text-2xl mb-10 text-red-50 leading-relaxed">
                Materiais de qualidade, preços competitivos e entrega rápida para sua obra.
                <br />
                <span className="text-yellow-200 font-semibold">Transforme seus projetos em realidade!</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/catalogo">
                  <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg px-8 py-6">
                    <Package className="mr-2 h-6 w-6" />
                    Ver Catálogo Completo
                  </Button>
                </Link>
                <Link href="/catalogo">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6">
                    Ver Ofertas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <Package className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Amplo Catálogo</h3>
              <p className="text-gray-600">Milhares de produtos para sua obra</p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Qualidade Garantida</h3>
              <p className="text-gray-600">Produtos certificados e de marcas confiáveis</p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <Truck className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Entrega Rápida</h3>
              <p className="text-gray-600">Receba seus materiais no prazo</p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <Clock className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Atendimento Rápido</h3>
              <p className="text-gray-600">Suporte dedicado para você</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              Produtos em Destaque
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Confira alguns dos nossos produtos mais procurados e transforme seus projetos em realidade
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts?.map?.((product: any) => (
              <Link
                key={product?.id}
                href={`/produto/${product?.slug}`}
                className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-red-200 transform hover:-translate-y-2"
              >
                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {product?.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product?.name ?? 'Produto'}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {(product?.stock ?? 0) > 0 && (
                    <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Em Estoque
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">
                    {product?.category?.name}
                  </span>
                  <h3 className="font-bold text-lg mt-2 mb-3 line-clamp-2 text-gray-900 group-hover:text-red-600 transition-colors">
                    {product?.name}
                  </h3>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-3xl font-extrabold text-red-600">
                        R$ {product?.price?.toFixed?.(2)}
                      </span>
                    </div>
                    {(product?.stock ?? 0) === 0 && (
                      <span className="text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        Indisponível
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/catalogo">
              <Button size="lg" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 px-8 py-6 text-lg font-semibold">
                Ver Todos os Produtos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </ClientLayoutWrapper>
  );
}
