import Link from 'next/link';
import Image from 'next/image';
import { Truck, Store, CreditCard, ShieldCheck, MapPin, Clock } from 'lucide-react';
import ClientLayoutWrapperDemo from '@/components/client-layout-wrapper-demo';
import ProductCardDemo from '@/components/product-card-demo';
import { getProducts } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  try {
    const result = await getProducts({ featured: true, limit: 5 });
    return result.products ?? [];
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <ClientLayoutWrapperDemo>
      {/* Hero / Featured Banners */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-4 h-[400px] md:h-[500px]">
          {/* Main Slider */}
          <div className="lg:col-span-8 relative rounded-2xl overflow-hidden bg-slate-900 group">
            <Image
              src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=2070&auto=format&fit=crop"
              alt="Campanha Primavera"
              fill
              className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority
            />
            <div className="absolute inset-0 p-10 flex flex-col justify-center text-white">
              <span className="bg-red-600 self-start px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded mb-6">
                Campanha Primavera
              </span>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight italic">
                Tudo para a sua <br /> Fundação.
              </h2>
              <p className="text-slate-300 max-w-md mb-8 hidden md:block">
                Garanta os melhores preços em cimento, ferro e agregados com entrega imediata em estaleiro.
              </p>
              <Link
                href="/catalogo"
                className="bg-white text-black self-start px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
              >
                Ver Produtos
              </Link>
            </div>
          </div>
          {/* Side Banner */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
            <div className="flex-1 rounded-2xl bg-slate-100 p-8 flex flex-col justify-end relative overflow-hidden group">
              <Image
                src="https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1000&auto=format&fit=crop"
                alt="Power Tools"
                fill
                className="object-cover opacity-20 grayscale group-hover:rotate-12 transition-transform"
                sizes="(max-width: 1024px) 0vw, 33vw"
              />
              <p className="text-xs font-bold text-red-600 mb-2 relative z-10">Power Tools</p>
              <h3 className="text-2xl font-bold mb-4 italic leading-none relative z-10">
                Novidades <br /> Bosch & Dewalt
              </h3>
              <Link
                href="/catalogo?category=ferramentas"
                className="text-[10px] font-bold uppercase border-b border-black self-start relative z-10"
              >
                Explorar
              </Link>
            </div>
            <div className="flex-1 rounded-2xl bg-black text-white p-8 flex flex-col justify-center relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-slate-400 mb-2 tracking-[0.3em]">PRO SERVICE</p>
                <h3 className="text-2xl font-bold mb-4 italic leading-none">Cálculo de <br /> Materiais</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Deixe que os nossos técnicos façam a conta por si.
                </p>
                <Link
                  href="/login"
                  className="bg-red-600 px-6 py-3 rounded-full text-[10px] font-bold uppercase hover:bg-red-700 transition-colors inline-block"
                >
                  Solicitar Apoio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold">Entrega na Obra</p>
              <p className="text-[9px] text-slate-400 uppercase">Em 24h/48h</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 p-3 rounded-lg">
              <Store className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold">Click & Collect</p>
              <p className="text-[9px] text-slate-400 uppercase">Levante em loja</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold">Pagamento Seguro</p>
              <p className="text-[9px] text-slate-400 uppercase">Até 12x s/ juros</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 p-3 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold">Garantia Técnica</p>
              <p className="text-[9px] text-slate-400 uppercase">Suporte Oficial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold italic mb-2 uppercase tracking-tighter">
              Mais <span className="text-red-600">Procurados</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Os essenciais mais vendidos esta semana em loja física e online.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="text-xs font-bold uppercase tracking-widest border-b-2 border-red-600 pb-1"
          >
            Ver Todos
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product: any, index: number) => (
              <ProductCardDemo
                key={product.id}
                product={product}
                showBadge={index === 0}
                badgeText={index === 0 ? 'Saldos' : index === 4 ? 'Novo' : undefined}
                badgeColor={index === 0 ? 'red' : index === 4 ? 'green' : undefined}
              />
            ))
          ) : (
            <div className="col-span-5 text-center py-12 text-slate-500">
              Nenhum produto em destaque encontrado.
            </div>
          )}
        </div>
      </section>

      {/* Visit Physical Store Banner */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
        <div className="bg-slate-900 rounded-[2rem] p-12 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
              <path d="M0 0 L100 0 L100 100 Z" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <h2 className="text-4xl font-bold text-white mb-6 italic">
              Visite o nosso <br />
              <span className="text-red-600">Centro de Aveiro.</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg leading-relaxed">
              Mais de 5.000m² de showroom com soluções reais para o seu projeto. Fale com os nossos especialistas e sinta a qualidade dos materiais antes de comprar.
            </p>
            <div className="flex flex-wrap gap-6 text-white text-xs font-bold uppercase tracking-widest mb-10">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-red-600" />
                Zona Industrial Sul
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-red-600" />
                Seg a Sex: 08:30 - 19:00
              </div>
            </div>
            <Link
              href="#"
              className="bg-white text-black px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all inline-block"
            >
              Como Chegar
            </Link>
          </div>
          <div className="relative z-10 w-full md:w-1/3">
            <Image
              src="https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=800&auto=format&fit=crop"
              alt="Loja MACOFEL"
              width={800}
              height={600}
              className="rounded-2xl shadow-2xl rotate-2"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </div>
      </section>
    </ClientLayoutWrapperDemo>
  );
}
