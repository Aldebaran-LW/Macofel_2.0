import Link from 'next/link';
import Image from 'next/image';
import {
  Truck,
  ShieldCheck,
  Clock,
  CreditCard,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  Award,
  Package,
  ChevronRight,
  Phone,
  Percent,
  Sparkles,
} from 'lucide-react';
import LayoutWrapperDecar from '@/components/layout-wrapper-decar';
import ProductCardV2 from '@/components/product-card-v2';
import { getProducts } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  try {
    const result = await getProducts({ featured: true, limit: 8 });
    return result.products ?? [];
  } catch {
    return [];
  }
}

async function getProductsByCategory(categorySlug: string, limit: number = 4) {
  try {
    const result = await getProducts({ categorySlug: categorySlug, limit });
    return result.products ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────
//  COMPONENTS INLINE (server-safe, sem estado)
// ─────────────────────────────────────────────────────────

function PixDiscountBanner() {
  return (
    <section className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 py-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
        }} />
      </div>
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg md:text-xl uppercase tracking-tight">
                Desconto Especial no PIX. Economize Agora!
              </h3>
              <p className="text-emerald-50 text-sm font-semibold">
                Cadastro feito, economia garantida. Pague no PIX e receba 10% de Desconto! É simples, seguro e seu valor já cai imediatamente.
              </p>
            </div>
          </div>
          <Link
            href="/cadastro"
            className="bg-white text-emerald-600 font-black px-6 py-3 rounded-xl hover:bg-emerald-50 transition-all uppercase text-sm tracking-wider whitespace-nowrap"
          >
            Cadastrar Agora
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3" />
              Ofertas Imperdíveis
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Os melhores produtos com{' '}
              <span className="text-red-500 italic">ofertas imperdíveis</span>{' '}
              para construir ou reformar
            </h1>

            <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Encontre tudo que você precisa para sua obra com os melhores preços do mercado. 
              Mais de 5.000 produtos em estoque com entrega rápida.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
              <Link
                href="/catalogo"
                className="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-red-600/30 hover:-translate-y-0.5 text-sm uppercase tracking-wider"
              >
                Ver Catálogo Completo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:+551133333333"
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl transition-all border border-white/10 text-sm uppercase tracking-wider"
              >
                <Phone className="w-4 h-4" />
                Falar com Consultor
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-xs font-bold text-slate-400">
              {[
                '✓ Frete Grátis acima de R$ 150',
                '✓ Pagamento 100% Seguro',
                '✓ Entrega em 24h ou 48h',
                '✓ Até 12x Sem Juros',
              ].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200&auto=format&fit=crop"
                alt="Materiais de Construção"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-slate-900 font-black text-sm mb-1">Economia Garantida</p>
                  <p className="text-slate-600 text-xs">Desconto de até 10% no PIX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesBar() {
  const services = [
    { icon: <Truck className="w-5 h-5" />, title: 'Entrega na Obra', sub: 'Em 24h ou 48h' },
    { icon: <ShieldCheck className="w-5 h-5" />, title: 'Compra Segura', sub: '100% protegida' },
    { icon: <CreditCard className="w-5 h-5" />, title: 'Até 12x Sem Juros', sub: 'No cartão' },
    { icon: <Clock className="w-5 h-5" />, title: 'Retire em 2 Horas', sub: 'Click & Collect' },
  ];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 -mt-6 relative z-10 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {services.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
              {s.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{s.title}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSection({ title, subtitle, products, badgeText, badgeColor }: {
  title: string;
  subtitle?: string;
  products: any[];
  badgeText?: string;
  badgeColor?: 'red' | 'green' | 'amber' | 'blue';
}) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-16">
      <div className="mb-8">
        {badgeText && (
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            {badgeText}
          </div>
        )}
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-600 text-lg">{subtitle}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product: any, index: number) => (
          <ProductCardV2
            key={product.id}
            product={product}
            badgeText={index === 0 ? badgeText : undefined}
            badgeColor={badgeColor}
            priority={index < 4}
          />
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <Link
          href="/catalogo"
          className="flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl transition-all"
        >
          Ver Todos <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

async function CategoryShowcaseSection() {
  const categories = [
    {
      name: 'Cimento & Argamassa',
      slug: 'cimento',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
      title: 'Produtos para fazer bonito na obra com economia',
      description: 'Cimento, argamassa e materiais de qualidade para sua construção',
    },
    {
      name: 'Acabamentos Elétricos',
      slug: 'eletrica',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop',
      title: 'Encontre os melhores acabamentos elétricos',
      description: 'Tudo para sua instalação elétrica com segurança e qualidade',
    },
    {
      name: 'Rejuntes & Pisos',
      slug: 'acabamentos',
      image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=600&auto=format&fit=crop',
      title: 'Os melhores rejuntes para pisos e porcelanatos',
      description: 'Acabamentos perfeitos para seu projeto',
    },
    {
      name: 'Banheiro',
      slug: 'hidraulica',
      image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=600&auto=format&fit=crop',
      title: 'Seu banheiro merece essa novidade',
      description: 'Louças, metais e acessórios para transformar seu banheiro',
    },
  ];

  return (
    <section className="bg-slate-50 py-16">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/catalogo?category=${cat.slug}`}
              className="group relative rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-white/80 text-sm mb-4">{cat.description}</p>
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    Ver produtos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <FeaturedSection
      title="Produtos em Destaque"
      subtitle="Selecionados especialmente para você"
      products={products}
      badgeText="Mais Vendidos"
      badgeColor="red"
    />
  );
}

async function CimentoProducts() {
  const products = await getProductsByCategory('cimento', 4);
  
  return (
    <FeaturedSection
      title="Produtos para fazer bonito na obra com economia"
      subtitle="Cimento, argamassa e materiais de qualidade"
      products={products}
      badgeText="Economia"
      badgeColor="green"
    />
  );
}

async function EletricaProducts() {
  const products = await getProductsByCategory('eletrica', 4);
  
  return (
    <FeaturedSection
      title="Encontre os melhores acabamentos elétricos"
      subtitle="Tudo para sua instalação elétrica"
      products={products}
      badgeText="Novo"
      badgeColor="blue"
    />
  );
}

async function BanheiroProducts() {
  const products = await getProductsByCategory('hidraulica', 4);
  
  return (
    <FeaturedSection
      title="Seu banheiro merece essa novidade"
      subtitle="Louças, metais e acessórios para transformar"
      products={products}
      badgeText="Novidade"
      badgeColor="amber"
    />
  );
}

async function RejuntesProducts() {
  const products = await getProductsByCategory('acabamentos', 4);
  
  return (
    <FeaturedSection
      title="Os melhores rejuntes para pisos e porcelanatos"
      subtitle="Acabamentos perfeitos para seu projeto"
      products={products}
      badgeText="Destaque"
      badgeColor="red"
    />
  );
}

function CtaBanner() {
  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-16">
      <div className="relative bg-gradient-to-r from-red-600 to-red-700 rounded-2xl overflow-hidden p-10 md:p-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Precisa de um Orçamento Personalizado?
            </h2>
            <p className="text-red-50 max-w-xl leading-relaxed mb-6">
              Envie as medidas do seu projeto e receba um orçamento detalhado com os melhores preços e orientação técnica gratuita.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-bold text-red-100">
              {['Resposta em minutos', 'Sem compromisso', 'Técnicos especializados'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 shrink-0">
            <Link
              href="/login"
              className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-red-600 font-black text-sm uppercase tracking-widest px-10 py-5 rounded-xl transition-all hover:shadow-xl"
            >
              Solicitar Orçamento Grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+551133333333"
              className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 px-10 py-5 rounded-xl transition-all"
            >
              <Phone className="w-4 h-4" />
              Ligar Agora: (11) 3333-3333
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────
export default async function HomePageDecar() {
  return (
    <LayoutWrapperDecar>
      <HeroSection />
      <ServicesBar />
      <FeaturedProducts />
      <CategoryShowcaseSection />
      <CimentoProducts />
      <EletricaProducts />
      <BanheiroProducts />
      <RejuntesProducts />
      <CtaBanner />
    </LayoutWrapperDecar>
  );
}
