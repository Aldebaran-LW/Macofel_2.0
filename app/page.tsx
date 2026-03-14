import Link from 'next/link';
import Image from 'next/image';
import {
  Truck,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  ShoppingCart,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import ProductSectionCarousel from '@/components/product-section-carousel';
import CategoriesInlineCarousel from '@/components/categories-inline-carousel';
import CategoryProductsCarousel from '@/components/category-products-carousel';
import HeroCarousel from '@/components/hero-carousel';
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

async function getRecentProducts() {
  try {
    const result = await getProducts({ limit: 8 });
    return result.products ?? [];
  } catch {
    return [];
  }
}

const FEATURED_SECONDARY_IMAGE_BY_CATEGORY: Record<string, string> = {
  'cimento e argamassa':
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop',
  'tijolos e blocos':
    'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?q=80&w=1000&auto=format&fit=crop',
  'tintas e acessorios':
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=1000&auto=format&fit=crop',
  ferramentas:
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1000&auto=format&fit=crop',
  'material hidraulico':
    'https://macofel-tres.lwdigitalforge.com/api/images/69b16bb18ca4517796426f87',
  'material eletrico':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1000&auto=format&fit=crop',
  hidraulica: 'https://macofel-tres.lwdigitalforge.com/api/images/69b16bb18ca4517796426f87',
  eletrica: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1000&auto=format&fit=crop',
};

function normalizeCategoryName(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getFeaturedSecondaryImage(categoryName?: string | null) {
  return FEATURED_SECONDARY_IMAGE_BY_CATEGORY[normalizeCategoryName(categoryName)] ?? null;
}

async function ProductsByCategory() {
  // Buscar categorias reais do banco de dados
  const db = await import('@/lib/mongodb-native').then(m => m.connectToDatabase());
  const categoriesCollection = db.collection('categories');
  const allCategories = await categoriesCollection.find({}).toArray();
  
  // Mapear categorias desejadas com slugs do banco
  const categoryMapping: Record<string, string[]> = {
    'Cimento & Argamassa': ['cimento-argamassa', 'cimento'],
    'Ferramentas': ['ferramentas'],
    'Elétrica': ['material-eletrico', 'eletrica', 'material eletrico'],
    'Hidráulica': ['material-hidraulico', 'hidraulica', 'material hidraulico'],
    'Tintas & Vernizes': ['tintas-acessorios', 'tintas'],
  };

  // Buscar produtos por categoria
  const categoriesWithProducts = await Promise.all(
    Object.entries(categoryMapping).map(async ([categoryName, possibleSlugs]) => {
      try {
        let products: any[] = [];
        
        // Tentar cada slug possível até encontrar produtos
        for (const slug of possibleSlugs) {
          const result = await getProducts({ categorySlug: slug, limit: 8 });
          if (result.products && result.products.length > 0) {
            products = result.products;
            break;
          }
        }
        
        // Se não encontrou por slug, buscar por nome da categoria nos produtos
        if (products.length === 0) {
          const allProducts = await getProducts({ limit: 50 });
          const categoryNameLower = categoryName.toLowerCase();
          products = (allProducts.products ?? []).filter((p: any) => {
            const productCategoryName = p.category?.name?.toLowerCase() || '';
            return productCategoryName.includes(categoryNameLower.split('&')[0].trim()) ||
                   productCategoryName.includes(categoryNameLower.split('e')[0].trim());
          }).slice(0, 8);
        }
        
        const mappedProducts = products.map((product: any) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          featured: product.featured,
          originalPrice: product.originalPrice,
          category: product.category ? { name: product.category.name } : null,
          secondaryImageUrl: getFeaturedSecondaryImage(product.category?.name),
        }));
        
        return {
          name: categoryName,
          slug: possibleSlugs[0],
          products: mappedProducts,
        };
      } catch (error) {
        console.error(`Erro ao buscar produtos para ${categoryName}:`, error);
        return {
          name: categoryName,
          slug: possibleSlugs[0],
          products: [],
        };
      }
    })
  );

  // Filtrar apenas categorias que têm produtos
  const categoriesWithProductsFiltered = categoriesWithProducts.filter(
    (cat) => cat.products.length > 0
  );

  if (categoriesWithProductsFiltered.length === 0) return null;

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      {categoriesWithProductsFiltered.map((category) => (
        <div key={category.slug} className="mb-16 last:mb-0">
          {/* Título da Categoria */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900">
              {category.name}
            </h2>
            <div className="h-1 w-16 bg-emerald-600 mt-2" />
          </div>

          {/* Carousel de Produtos */}
          {category.products && category.products.length > 0 && (
            <CategoryProductsCarousel
              products={category.products}
            />
          )}

          {/* Link para ver mais */}
          <div className="flex justify-center mt-8">
            <Link
              href={`/catalogo?category=${category.slug}`}
              className="flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl transition-all"
            >
              Ver todos de {category.name} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}

// Componentes no estilo Decar
function TopBar() {
  return (
    <div className="bg-emerald-600 text-white text-center py-2 text-sm font-medium">
      <span>Compre com 10% OFF no PIX!</span>
      <span className="mx-2">/</span>
      <span>Enviamos para todo o Brasil</span>
      <span className="mx-2">/</span>
      <span>Envie sua lista de materiais</span>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-macofel.png"
              alt="MACOFEL"
              width={60}
              height={60}
              className="h-14 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-800 tracking-tight">
                MACO<span className="text-red-600">FEL</span>
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Materiais para Construção
              </span>
            </div>
          </Link>

          {/* Busca */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Faça uma pesquisa..."
                className="w-full border-2 border-gray-200 rounded-lg py-3 px-4 pr-12 focus:border-red-500 focus:outline-none"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/login" className="text-sm text-gray-600 hover:text-red-600">
              <span className="font-bold">Entre</span> ou<br />
              <span className="font-bold">Cadastre-se</span>
            </Link>
            <Link href="/carrinho" className="flex items-center gap-2 text-gray-600 hover:text-red-600">
              <ShoppingCart className="w-6 h-6" />
              <span className="font-bold">0</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Menu de Categorias */}
      <nav className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center justify-center gap-8 py-3 text-sm font-semibold text-gray-700">
            <li><Link href="/catalogo?category=banheiro" className="hover:text-red-600 transition-colors">Banheiro</Link></li>
            <li><Link href="/catalogo?category=cozinha" className="hover:text-red-600 transition-colors">Cozinha</Link></li>
            <li><Link href="/catalogo?category=eletrica" className="hover:text-red-600 transition-colors">Materiais Elétricos</Link></li>
            <li><Link href="/catalogo?category=hidraulica" className="hover:text-red-600 transition-colors">Materiais Hidráulicos</Link></li>
            <li><Link href="/catalogo?category=ferramentas" className="hover:text-red-600 transition-colors">Ferramentas</Link></li>
            <li><Link href="/catalogo?category=tintas" className="hover:text-red-600 transition-colors">Tintas</Link></li>
            <li><Link href="/catalogo" className="text-red-600 font-bold">+ Categorias</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

function HeroBanner() {
  const slides = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1920&auto=format&fit=crop',
      subtitle: 'RESGATE SEU CUPOM',
      title: 'PRIMEIRACOMPRA',
      text: 'E APROVEITE OFERTAS EM TODO O SITE • ENTREGAS PARA TODO O BRASIL',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1920&auto=format&fit=crop',
      subtitle: 'FERRAMENTAS DE QUALIDADE',
      title: 'CONSTRUA COM CONFIANÇA',
      text: 'As melhores ferramentas para sua obra • Até 12x sem juros',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1920&auto=format&fit=crop',
      subtitle: 'MATERIAIS ELÉTRICOS',
      title: 'INSTALAÇÃO COMPLETA',
      text: 'Tudo para sua instalação elétrica • Entrega rápida e segura',
    },
    {
      id: '4',
      image: 'https://macofel-tres.lwdigitalforge.com/api/images/69b16bb18ca4517796426f87',
      subtitle: 'MATERIAIS HIDRÁULICOS',
      title: 'QUALIDADE GARANTIDA',
      text: 'Produtos certificados • Melhor preço da região',
    },
  ];

  return <HeroCarousel slides={slides} autoPlayInterval={5000} />;
}

function ServiceBadges() {
  const services = [
    { icon: <Truck className="w-5 h-5" />, text: 'Entrega rápida', color: 'text-red-600' },
    { icon: <MessageCircle className="w-5 h-5" />, text: 'Envie sua lista de materiais', color: 'text-emerald-600' },
    { icon: <CreditCard className="w-5 h-5" />, text: 'Desconto no Pix', color: 'text-amber-600' },
    { icon: <ShieldCheck className="w-5 h-5" />, text: 'Fale pelo WhatsApp', color: 'text-green-600' },
  ];

  return (
    <div className="bg-white py-4 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {services.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <span className={s.color}>{s.icon}</span>
              <span className="text-sm font-semibold text-gray-700">{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const pixPrice = (product.price * 0.9).toFixed(2).replace('.', ',');
  const installment = (product.price / 12).toFixed(2).replace('.', ',');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group">
      {/* Imagem */}
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
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

      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">(0)</span>
      </div>

      {/* Preço */}
      <div className="mb-4">
        <p className="text-xl font-black text-emerald-600">
          R$ {pixPrice} <span className="text-sm font-bold">no PIX</span>
        </p>
        <p className="text-xs text-gray-500">
          12x de R$ {installment} no cartão s/ juros
        </p>
      </div>

      {/* Botão Comprar */}
      <Link
        href={`/produto/${product.slug}`}
        className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold py-3 rounded-lg transition-colors"
      >
        Comprar
      </Link>
    </div>
  );
}


function CategoryCards() {
  const categories = [
    {
      name: 'Cimento & Argamassa',
      slug: 'cimento',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
      color: 'from-slate-800',
    },
    {
      name: 'Ferramentas',
      slug: 'ferramentas',
      image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=600&auto=format&fit=crop',
      color: 'from-red-900',
    },
    {
      name: 'Elétrica',
      slug: 'eletrica',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop',
      color: 'from-amber-900',
    },
    {
      name: 'Hidráulica',
      slug: 'hidraulica',
      image: 'https://macofel-tres.lwdigitalforge.com/api/images/69b16bb18ca4517796426f87',
      color: 'from-blue-900',
    },
    {
      name: 'Acabamentos',
      slug: 'acabamentos',
      image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?q=80&w=600&auto=format&fit=crop',
      color: 'from-emerald-900',
    },
    {
      name: 'Tintas & Vernizes',
      slug: 'tintas',
      image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=600&auto=format&fit=crop',
      color: 'from-purple-900',
    },
    {
      name: 'Iluminação',
      slug: 'iluminacao',
      image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?q=80&w=600&auto=format&fit=crop',
      color: 'from-yellow-900',
    },
    {
      name: 'Jardinagem',
      slug: 'jardim',
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop',
      color: 'from-green-900',
    },
  ];

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <CategoriesInlineCarousel categories={categories} />
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo e Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black">
                MACO<span className="text-red-500">FEL</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Materiais para Construção de qualidade em Parapuã e região.
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>📍 Av. São Paulo, 699 - Centro</p>
              <p>Parapuã - SP, 17730-000</p>
              <p>📞 (18) 99814-5495</p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold mb-4">Institucional</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white">Sobre nós</Link></li>
              <li><Link href="#" className="hover:text-white">Política de Privacidade</Link></li>
              <li><Link href="#" className="hover:text-white">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white">Fale Conosco</Link></li>
              <li><Link href="#" className="hover:text-white">Trocas e Devoluções</Link></li>
              <li><Link href="/meus-pedidos" className="hover:text-white">Meus Pedidos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Formas de Pagamento</h4>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Visa</span>
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Master</span>
              <span className="bg-green-600 px-3 py-1 rounded text-xs">Pix</span>
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Boleto</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          <p>© 2026 MACOFEL - Materiais para Construção. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFloating() {
  return (
    <a
      href="https://wa.me/5518998145495?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20MACOFEL%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="font-bold text-sm">Fale conosco</span>
    </a>
  );
}

async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  if (products.length === 0) return null;

  const productsWithSecondary = products.map((product: any) => ({
    ...product,
    secondaryImageUrl: getFeaturedSecondaryImage(product.category?.name),
  }));

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 mb-24">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 mb-3">
            Selecionados para Você
          </p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
            Produtos em
            <br />
            <span className="text-emerald-600">Destaque</span>
          </h2>
        </div>
        <Link
          href="/catalogo"
          className="hidden md:flex items-center gap-2 text-sm font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl transition-all"
        >
          Ver Todos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {productsWithSecondary.length > 0 ? (
        <CategoryProductsCarousel products={productsWithSecondary} />
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

export default async function HomePageDecarStyle() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Header />
      <HeroBanner />
      <ServiceBadges />
      <CategoryCards />
      <FeaturedProducts />
      <ProductsByCategory />
      <Footer />
      <WhatsAppFloating />
    </div>
  );
}
