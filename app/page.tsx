import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import ProductSectionCarousel from '@/components/product-section-carousel';
import CategoriesInlineCarousel from '@/components/categories-inline-carousel';
import CategoryProductsCarousel from '@/components/category-products-carousel';
import HeroCarousel from '@/components/hero-carousel';
import HeaderMobile from '@/components/header-mobile';
import StoreTopBar from '@/components/store-top-bar';
import StoreFooter from '@/components/store-footer';
import StoreWhatsAppFloat from '@/components/store-whatsapp-float';
import StoreServiceBadges from '@/components/store-service-badges';
import { getHeroSlides, getProducts } from '@/lib/mongodb-native';
import { HERO_DEFAULT_SLIDES } from '@/lib/hero-default-slides';

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
function Header() {
  return <HeaderMobile />;
}

function HeaderFallback() {
  return <div className="bg-white shadow-sm sticky top-0 z-50 h-24 border-b border-gray-100" aria-hidden />;
}

async function getHeroBannerSlides() {
  try {
    const dbSlides = await getHeroSlides();
    if (dbSlides.length > 0) {
      return dbSlides.map((slide) => ({
        id: String(slide.id),
        image: slide.imageUrl,
        subtitle: slide.subtitle ?? undefined,
        title: slide.title ?? undefined,
        text: slide.text ?? undefined,
        href: slide.href ?? undefined,
      }));
    }
  } catch (error) {
    console.error('Erro ao buscar slides do hero no MongoDB:', error);
  }

  return HERO_DEFAULT_SLIDES.map((slide, index) => ({
    id: String(index + 1),
    image: slide.imageUrl,
    subtitle: slide.subtitle ?? undefined,
    title: slide.title ?? undefined,
    text: slide.text ?? undefined,
    href: slide.href ?? undefined,
  }));
}

async function HeroBanner() {
  const slides = await getHeroBannerSlides();
  return <HeroCarousel slides={slides} autoPlayInterval={5000} />;
}

function ServiceBadges() {
  return <StoreServiceBadges />;
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
      <StoreTopBar />
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <HeroBanner />
      <ServiceBadges />
      <CategoryCards />
      <FeaturedProducts />
      <ProductsByCategory />
      <StoreFooter />
      <StoreWhatsAppFloat />
    </div>
  );
}
