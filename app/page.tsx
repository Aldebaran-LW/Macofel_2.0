import Link from 'next/link';
import Image from 'next/image';
import { Package, Truck, ShieldCheck, Clock, ArrowRight, Award, Users, Search, ShoppingCart, Menu, Phone, Mail, MapPin, Instagram, Linkedin, Facebook, Send, HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientLayoutWrapper from '@/components/client-layout-wrapper';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true },
      include: { category: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
    });
    return products ?? [];
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return [];
  }
}

async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      take: 3,
      orderBy: { name: 'asc' },
    });
    return categories ?? [];
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();
  const categories = await getCategories();

  // Mapear categorias para imagens
  const categoryImages: Record<string, string> = {
    'Cimento e Argamassa': 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=600',
    'Tijolos e Blocos': 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=600',
    'Tintas e Acessórios': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=600',
    'Ferramentas': 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=600',
    'Material Hidráulico': 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=600',
    'Material Elétrico': 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=600',
  };

  const categoryTitles: Record<string, string> = {
    'Cimento e Argamassa': 'Estrutura e Brutos',
    'Tijolos e Blocos': 'Estrutura e Brutos',
    'Tintas e Acessórios': 'Acabamentos',
    'Ferramentas': 'Equipamento',
    'Material Hidráulico': 'Instalações',
    'Material Elétrico': 'Equipamento',
  };

  const categoryDescriptions: Record<string, string> = {
    'Cimento e Argamassa': 'Cimento, ferro, tijolo e agregados.',
    'Tijolos e Blocos': 'Cimento, ferro, tijolo e agregados.',
    'Tintas e Acessórios': 'Cerâmicos, louças e pavimentos.',
    'Ferramentas': 'Máquinas e ferramentas elétricas.',
    'Material Hidráulico': 'Tubos, conexões e instalações.',
    'Material Elétrico': 'Máquinas e ferramentas elétricas.',
  };

  return (
    <ClientLayoutWrapper>
      {/* Hero Section */}
      <section id="inicio" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden hero-gradient">
        {/* Overlay de padrão de rede para aspeto industrial */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '24px 24px'}}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 py-1 px-3 rounded-md bg-red-600/10 border border-red-600/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Líderes em Distribuição Técnica</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black font-title text-white leading-tight mb-8 uppercase italic tracking-tighter">
                MACOFEL<br /> 
                <span className="text-red-600">Sólida</span> em cada detalhe.
              </h1>
              <p className="text-slate-400 text-lg mb-10 max-w-lg leading-relaxed font-light">
                Desde a fundação até ao acabamento. Fornecemos os melhores materiais de construção com a confiança e tradição que a sua obra merece.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#produtos" className="bg-macofel-red text-white px-8 py-5 rounded-sm font-black text-xs uppercase tracking-[0.2em] text-center hover:bg-red-700 transition-all flex items-center justify-center gap-3 red-glow">
                  Explorar Materiais
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="bg-white/5 border border-white/10 text-white px-8 py-5 rounded-sm font-black text-xs uppercase tracking-[0.2em] text-center hover:bg-white/10 transition-all backdrop-blur-sm">
                  Área Profissional
                </Link>
              </div>
            </div>
            <div className="hidden lg:block relative mt-12 lg:mt-0">
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border-l-8 border-red-600">
                <Image 
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1000" 
                  alt="Obra de Engenharia" 
                  fill
                  className="object-cover grayscale-[30%] brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-[1px] flex-1 bg-red-600"></div>
                    <span className="text-red-600 font-black text-xs uppercase tracking-widest">Especialistas</span>
                  </div>
                  <p className="text-white text-3xl font-black font-title leading-none uppercase italic">Qualidade de<br />Nível Industrial</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-100">
          <div className="p-8 text-center border-r border-slate-100 group hover:bg-slate-50 transition-colors">
            <Award className="w-6 h-6 mx-auto mb-4 text-red-600" />
            <p className="text-3xl font-black text-slate-900">25+</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Anos de Mercado</p>
          </div>
          <div className="p-8 text-center md:border-r border-slate-100 group hover:bg-slate-50 transition-colors">
            <Truck className="w-6 h-6 mx-auto mb-4 text-red-600" />
            <p className="text-3xl font-black text-slate-900">24h</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Entrega na Obra</p>
          </div>
          <div className="p-8 text-center border-r border-slate-100 group hover:bg-slate-50 transition-colors">
            <Package className="w-6 h-6 mx-auto mb-4 text-red-600" />
            <p className="text-3xl font-black text-slate-900">10k+</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Itens em Stock</p>
          </div>
          <div className="p-8 text-center group hover:bg-slate-50 transition-colors">
            <Users className="w-6 h-6 mx-auto mb-4 text-red-600" />
            <p className="text-3xl font-black text-slate-900">5k+</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Clientes Satisfeitos</p>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <section id="categorias" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div className="max-w-xl">
              <h2 className="text-4xl font-black font-title uppercase tracking-tighter italic">O Nosso <span className="text-red-600">Arsenal</span></h2>
              <p className="text-slate-500 mt-4 leading-relaxed">Desde materiais brutos até acabamentos refinados, a Macofel é o seu parceiro único para qualquer projeto de construção.</p>
            </div>
            <Link href="/catalogo" className="border-b-2 border-red-600 pb-1 text-sm font-black uppercase tracking-widest hover:text-red-600 transition-colors">
              Ver Catálogo Completo
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.slice(0, 3).map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?category=${category.slug}`}
                className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer"
              >
                <Image
                  src={categoryImages[category.name] || 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=600'}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <h3 className="text-white text-2xl font-black font-title uppercase italic">
                    {categoryTitles[category.name] || category.name}
                  </h3>
                  <p className="text-slate-300 text-sm mt-2">
                    {categoryDescriptions[category.name] || category.description || 'Materiais de qualidade'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Produtos Destaque */}
      <section id="produtos" className="bg-slate-100 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="text-2xl font-black font-title uppercase italic tracking-tighter">Produtos em <span className="text-red-600">Vigor</span></h2>
            <div className="h-[2px] flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/produto/${product.slug}`}
                  className="bg-white rounded-xl overflow-hidden product-card transition-all duration-300 group border border-slate-200 shadow-sm"
                >
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <Package className="w-16 h-16 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-red-600 text-white text-[9px] font-black py-1 px-3 rounded uppercase tracking-widest">Destaque</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-black text-slate-900 text-sm uppercase mb-4 h-10 overflow-hidden line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-slate-900">R$ {product.price.toFixed(2)}</p>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/produto/${product.slug}`;
                        }}
                        className="bg-slate-900 text-white p-3 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-4 text-center py-12 text-slate-500">
                Nenhum produto em destaque encontrado.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Orçamento Rápido */}
      <section id="orcamento" className="py-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 opacity-10">
              <HardHat className="w-64 h-64 text-white rotate-12" />
            </div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl lg:text-5xl font-black font-title text-white italic uppercase tracking-tighter mb-6 leading-none">
                  Precisa de um<br />
                  <span className="text-red-600 underline underline-offset-8">Orçamento?</span>
                </h2>
                <p className="text-slate-400 text-lg mb-8 font-light">
                  Envie-nos a sua lista de materiais ou o ficheiro do projeto. A nossa equipa técnica responde em menos de 2 horas com as melhores condições do mercado.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="font-bold">(11) 3333-3333</span>
                  </div>
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="font-bold">comercial@macofel.com</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-2xl">
                <form className="space-y-4" action="/api/contact" method="POST">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      name="name"
                      placeholder="Nome" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg focus:outline-none focus:border-red-600 transition-colors font-semibold text-sm"
                      required
                    />
                    <input 
                      type="text" 
                      name="phone"
                      placeholder="Telemóvel" 
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg focus:outline-none focus:border-red-600 transition-colors font-semibold text-sm"
                      required
                    />
                  </div>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="Email institucional" 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg focus:outline-none focus:border-red-600 transition-colors font-semibold text-sm"
                    required
                  />
                  <textarea 
                    name="message"
                    placeholder="Liste aqui os materiais ou descreva a sua obra..." 
                    rows={4} 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg focus:outline-none focus:border-red-600 transition-colors font-semibold text-sm"
                    required
                  ></textarea>
                  <button 
                    type="submit"
                    className="w-full bg-red-600 text-white py-5 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all active:scale-[0.98]"
                  >
                    Solicitar Cotação Técnica
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ClientLayoutWrapper>
  );
}
