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
} from 'lucide-react';
import LayoutWrapperV2 from '@/components/layout-wrapper-v2';
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

// ─────────────────────────────────────────────────────────
//  COMPONENTS INLINE (server-safe, sem estado)
// ─────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="hero-v2-bg relative overflow-hidden min-h-[88vh] flex items-center">
      {/* Radial glow */}
      <div className="hero-v2-accent absolute inset-0 pointer-events-none" />

      {/* Grid texture overlay */}
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
            {/* Tag badge */}
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
              Mais de 5.000 produtos em estoque — cimento, ferramentas, elétrica, hidráulica e
              muito mais. Entrega direta na sua obra em até 48h.
            </p>

            {/* CTAs */}
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

            {/* Trust bullets */}
            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
              {[
                '✓ Desde 1998',
                '✓ +10.000 Clientes',
                '✓ 5.000m² de Estoque',
                '✓ Garantia Técnica',
              ].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right: Image grid */}
          <div className="hidden lg:grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
                <Image
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop"
                  alt="Construção"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  Fundação
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square group">
                <Image
                  src="https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=800&auto=format&fit=crop"
                  alt="Ferramentas"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  Ferramentas Pro
                </div>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="relative rounded-2xl overflow-hidden aspect-square group">
                <Image
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop"
                  alt="Elétrica"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  Elétrica
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
                <Image
                  src="https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=800&auto=format&fit=crop"
                  alt="Acabamentos"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  Acabamentos
                </div>
              </div>
            </div>
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
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
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

function CategoryShowcase() {
  const categories = [
    {
      name: 'Cimento & Argamassa',
      slug: 'cimento',
      image:
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
      color: 'from-slate-800',
    },
    {
      name: 'Ferramentas',
      slug: 'ferramentas',
      image:
        'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=600&auto=format&fit=crop',
      color: 'from-red-900',
    },
    {
      name: 'Elétrica',
      slug: 'eletrica',
      image:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop',
      color: 'from-amber-900',
    },
    {
      name: 'Hidráulica',
      slug: 'hidraulica',
      image:
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=600&auto=format&fit=crop',
      color: 'from-blue-900',
    },
    {
      name: 'Acabamentos',
      slug: 'acabamentos',
      image:
        'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=600&auto=format&fit=crop',
      color: 'from-emerald-900',
    },
    {
      name: 'Tintas & Vernizes',
      slug: 'tintas',
      image:
        'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=600&auto=format&fit=crop',
      color: 'from-purple-900',
    },
  ];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
            Departamentos
          </p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
            O que você está
            <br />
            <span className="text-red-600">procurando?</span>
          </h2>
        </div>
        <Link
          href="/catalogo"
          className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-600 transition-colors"
        >
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((cat, i) => (
          <Link
            key={cat.slug}
            href={`/catalogo?category=${cat.slug}`}
            className="group relative rounded-2xl overflow-hidden aspect-[3/4] category-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-600"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-t ${cat.color} via-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity`}
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-white font-black text-sm leading-tight">{cat.name}</p>
              <div className="flex items-center gap-1 text-white/60 text-[10px] font-bold uppercase mt-1 group-hover:text-white/80 transition-colors">
                Ver produtos <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: '28+', label: 'Anos de Experiência', icon: <Award className="w-6 h-6" /> },
    { value: '+10K', label: 'Clientes Satisfeitos', icon: <Users className="w-6 h-6" /> },
    { value: '+5K', label: 'Produtos em Estoque', icon: <Package className="w-6 h-6" /> },
    { value: '98%', label: 'Entregas no Prazo', icon: <Truck className="w-6 h-6" /> },
  ];

  return (
    <section className="bg-slate-950 py-20 mb-24">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center border-r border-white/5 last:border-r-0 px-4"
            >
              <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                {s.icon}
              </div>
              <p className="text-4xl md:text-5xl font-black text-white stat-number mb-2">
                {s.value}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  const badges = [
    { text: 'Mais Vendido', color: 'red' as const },
    { text: 'Destaque', color: 'amber' as const },
    { text: 'Novo', color: 'green' as const },
  ];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
            Selecionados para Você
          </p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
            Produtos em
            <br />
            <span className="text-red-600">Destaque</span>
          </h2>
        </div>
        <Link
          href="/catalogo"
          className="hidden md:flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl transition-all"
        >
          Ver Todos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product: any, index: number) => (
            <ProductCardV2
              key={product.id}
              product={product}
              badgeText={index < 3 ? badges[index]?.text : undefined}
              badgeColor={index < 3 ? badges[index]?.color : undefined}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className="col-span-4 text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📦</div>
          <p className="font-bold">Nenhum produto em destaque encontrado.</p>
        </div>
      )}

      <div className="flex justify-center mt-10 md:hidden">
        <Link
          href="/catalogo"
          className="flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 px-8 py-3 rounded-xl"
        >
          Ver Todos os Produtos
        </Link>
      </div>
    </section>
  );
}

function WhyUsSection() {
  const reasons = [
    {
      icon: <Award className="w-7 h-7 text-red-600" />,
      title: 'Qualidade Certificada',
      desc: 'Todos os nossos materiais são provenientes de fornecedores homologados e possuem certificação de qualidade.',
    },
    {
      icon: <Truck className="w-7 h-7 text-red-600" />,
      title: 'Entrega Rápida',
      desc: 'Frota própria para entregas em São Paulo. Seu pedido na obra em 24h ou 48h com rastreamento em tempo real.',
    },
    {
      icon: <Users className="w-7 h-7 text-red-600" />,
      title: 'Assessoria Técnica',
      desc: 'Equipe de engenheiros e técnicos especializados prontos para calcular e orientar o seu projeto.',
    },
    {
      icon: <ShieldCheck className="w-7 h-7 text-red-600" />,
      title: 'Garantia de 30 Dias',
      desc: 'Compra protegida e suporte completo. Em caso de problemas, trocamos ou reembolsamos sem burocracia.',
    },
    {
      icon: <Zap className="w-7 h-7 text-red-600" />,
      title: 'Orçamento em Minutos',
      desc: 'Envie as medidas do seu projeto e receba um orçamento completo e personalizado em minutos.',
    },
    {
      icon: <CreditCard className="w-7 h-7 text-red-600" />,
      title: 'Condições Especiais',
      desc: 'Até 12x sem juros no cartão, boleto parcelado, PIX com desconto e crédito especial para empresas.',
    },
  ];

  return (
    <section className="bg-slate-50 py-24 mb-24">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
            Por que escolher a MACOFEL?
          </p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
            A diferença está nos
            <br />
            <span className="text-red-600">Detalhes.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-red-200 hover:shadow-lg transition-all group"
            >
              <div className="w-14 h-14 bg-red-50 group-hover:bg-red-100 rounded-2xl flex items-center justify-center mb-6 transition-colors">
                {r.icon}
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-3">{r.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Carlos Eduardo',
      role: 'Mestre de Obras',
      avatar: 'CE',
      stars: 5,
      text: 'Trabalho com a MACOFEL há 8 anos. O material é sempre de primeira e a entrega nunca falha. Recomendo para todos os colegas da área.',
    },
    {
      name: 'Mariana Alves',
      role: 'Arquiteta',
      avatar: 'MA',
      stars: 5,
      text: 'Fornecedor indispensável para meus projetos. A assessoria técnica me ajudou a economizar materiais e tempo de obra.',
    },
    {
      name: 'João Roberto',
      role: 'Empreiteiro',
      avatar: 'JR',
      stars: 5,
      text: 'Preços competitivos, catálogo enorme e atendimento excelente. A compra online ficou muito prática — recebo os pedidos em 24h.',
    },
  ];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <div className="text-center mb-12">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
          Depoimentos
        </p>
        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
          Quem constrói com a gente
          <br />
          <span className="text-red-600">não troca.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-6">
              {[...Array(t.stars)].map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 italic">"{t.text}"</p>
            <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                {t.avatar}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <div className="relative bg-slate-950 rounded-[2rem] overflow-hidden p-10 md:p-16">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-4">
              Pro Service · Exclusivo MACOFEL
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-tight mb-6">
              Precisa de um
              <br />
              <span className="text-red-500">Orçamento?</span>
            </h2>
            <p className="text-slate-400 max-w-xl leading-relaxed">
              Envie as medidas do seu projeto e receba um orçamento detalhado com os melhores preços
              e orientação técnica gratuita.
            </p>

            <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold text-slate-500 uppercase">
              {['Resposta em minutos', 'Sem compromisso', 'Técnicos especializados'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 shrink-0">
            <Link
              href="/login"
              className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl transition-all hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5"
            >
              Solicitar Orçamento Grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+551133333333"
              className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 px-10 py-5 rounded-2xl transition-all"
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

function StoreVisitSection() {
  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer">
          <Image
            src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=1200&auto=format&fit=crop"
            alt="Loja MACOFEL"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="50vw"
          />
          {/* Enhanced gradient overlay with hover effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/30 to-transparent group-hover:from-black/70 group-hover:via-black/40 transition-all duration-500" />
          {/* Additional gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
          <div className="absolute bottom-6 left-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 group-hover:bg-white/15 transition-all duration-300">
            <p className="text-white font-black text-lg">5.000m²</p>
            <p className="text-white/70 text-xs font-bold uppercase">de Showroom</p>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600 mb-3">
              Loja Física
            </p>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
              Visite o nosso
              <br />
              <span className="text-red-600">Showroom.</span>
            </h2>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Mais de 5.000m² com soluções reais para o seu projeto. Toque e sinta a qualidade dos
            nossos materiais antes de comprar. Nossos especialistas estão prontos para orientar.
          </p>

          <div className="space-y-4">
            {[
              { icon: <MapPin className="w-4 h-4 text-red-600" />, text: 'Av. São Paulo, 699 - Centro, Parapuã - SP, 17730-000' },
              { icon: <Clock className="w-4 h-4 text-red-600" />, text: 'Seg a Sex: 08:00 — 18:00 | Sáb: 08:00 — 13:00' },
              { icon: <Phone className="w-4 h-4 text-red-600" />, text: '(11) 3333-3333 | (11) 99999-9999' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 text-sm text-slate-600 font-medium">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                {item.text}
              </div>
            ))}
          </div>

          <a
            href="https://www.google.com/maps/place/Macofel+Parapu%C3%A3/@-21.7792204,-50.7964705,17z/data=!4m15!1m8!3m7!1s0x94942f5400b5375b:0x698d25456ba379a4!2sMacofel+Parapu%C3%A3!8m2!3d-21.7792205!4d-50.7915996!10e1!16s%2Fg%2F11vbkfnwr2!3m5!1s0x94942f5400b5375b:0x698d25456ba379a4!8m2!3d-21.7792205!4d-50.7915996!16s%2Fg%2F11vbkfnwr2?entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-slate-900 hover:bg-red-600 text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all"
          >
            VER NO MAPA
            <MapPin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────
export default async function HomePage() {
  return (
    <LayoutWrapperV2>
      <HeroSection />
      <ServicesBar />
      <CategoryShowcase />
      <StatsSection />
      <FeaturedProducts />
      <WhyUsSection />
      <TestimonialsSection />
      <CtaBanner />
      <StoreVisitSection />
    </LayoutWrapperV2>
  );
}
