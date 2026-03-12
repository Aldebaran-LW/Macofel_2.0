'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  ShoppingCart,
  Star,
  Heart,
  MessageCircle,
  Truck,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import WhatsAppButton from '@/components/whatsapp-button';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: { name: string; slug: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

function CatalogoContent() {
  const { data: session } = useSession() ?? {};
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams?.get('search') ?? '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') ?? '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [wishedIds, setWishedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [page, selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json() ?? []);
    } catch {}
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data?.products ?? []);
        setTotalPages(data?.pagination?.totalPages ?? 1);
        setTotalProducts(data?.pagination?.total ?? 0);
      } else {
        toast.error(data?.error || 'Erro ao buscar produtos');
        setProducts([]);
      }
    } catch {
      toast.error('Erro de conexão');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      toast.error('Faça login para adicionar ao carrinho');
      router.push('/login');
      return;
    }
    setAddingId(product.id);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (res.ok) toast.success('Adicionado ao carrinho!');
      else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao adicionar');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setAddingId(null);
    }
  };

  const toggleWish = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setWishedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success('Removido dos favoritos'); }
      else { next.add(id); toast.success('Adicionado aos favoritos ❤️'); }
      return next;
    });
  };

  const hasFilters = search || selectedCategory || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar Azul */}
      <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
        <span>Compre com 10% OFF no PIX!</span>
        <span className="mx-2">/</span>
        <span>Enviamos para todo o Brasil</span>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-8">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo-macofel.png" alt="MACOFEL" width={60} height={60} className="h-14 w-auto object-contain" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-800 tracking-tight">MACO<span className="text-red-600">FEL</span></span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Materiais para Construção</span>
              </div>
            </Link>
            <div className="flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Faça uma pesquisa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg py-3 px-4 pr-12 focus:border-red-500 focus:outline-none"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600">
                  <Search className="w-5 h-5" />
                </button>
              </form>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <Link href="/login" className="text-sm text-gray-600 hover:text-red-600">
                <span className="font-bold">Entre</span> ou<br /><span className="font-bold">Cadastre-se</span>
              </Link>
              <Link href="/carrinho" className="flex items-center gap-2 text-gray-600 hover:text-red-600">
                <ShoppingCart className="w-6 h-6" /><span className="font-bold">0</span>
              </Link>
            </div>
          </div>
        </div>
        <nav className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-center justify-center gap-8 py-3 text-sm font-semibold text-gray-700">
              <li><Link href="/catalogo?category=banheiro" className="hover:text-red-600 transition-colors">Banheiro</Link></li>
              <li><Link href="/catalogo?category=cozinha" className="hover:text-red-600 transition-colors">Cozinha</Link></li>
              <li><Link href="/catalogo?category=material-eletrico" className="hover:text-red-600 transition-colors">Materiais Elétricos</Link></li>
              <li><Link href="/catalogo?category=material-hidraulico" className="hover:text-red-600 transition-colors">Hidráulica</Link></li>
              <li><Link href="/catalogo?category=ferramentas" className="hover:text-red-600 transition-colors">Ferramentas</Link></li>
              <li><Link href="/catalogo?category=tintas-acessorios" className="hover:text-red-600 transition-colors">Tintas</Link></li>
              <li><Link href="/catalogo" className="text-red-600 font-bold">+ Categorias</Link></li>
            </ul>
          </div>
        </nav>
      </header>

      {/* Service Badges */}
      <div className="bg-white py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Truck className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-gray-700">Entrega rápida</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-semibold text-gray-700">Desconto no Pix</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Fale pelo WhatsApp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="text-sm text-gray-500 font-medium flex items-center gap-2">
            <Link href="/" className="hover:text-red-600 transition-colors">Início</Link>
            <span>/</span>
            <span className="text-gray-800">Catálogo</span>
            {selectedCategory && (
              <>
                <span>/</span>
                <span className="text-red-600 font-bold">
                  {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                </span>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.name ?? 'Catálogo'
              : 'Todos os Produtos'}
          </h1>
          <p className="text-gray-500 mt-1">
            {totalProducts > 0
              ? `${totalProducts} produto${totalProducts !== 1 ? 's' : ''} encontrado${totalProducts !== 1 ? 's' : ''}`
              : 'Explore nossa linha completa de materiais'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* ── SIDEBAR ─────────────────────── */}
          <aside
            className={`${
              showFilters
                ? 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-start md:relative md:inset-auto md:z-auto md:bg-transparent md:backdrop-blur-none'
                : 'hidden md:block'
            } md:w-64 shrink-0`}
          >
            <div
              className={`bg-white md:bg-transparent w-full md:w-auto rounded-t-3xl md:rounded-none max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-visible shadow-2xl md:shadow-none`}
            >
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between p-5 md:hidden border-b border-slate-100">
                <span className="font-black text-sm uppercase tracking-wider">Filtros</span>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 md:p-0 space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Buscar
                  </label>
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      type="text"
                      placeholder="Nome do produto..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Categorias
                  </label>
                  <div className="space-y-1">
                    <button
                      onClick={() => { setSelectedCategory(''); setPage(1); }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedCategory === ''
                          ? 'bg-red-600 text-white'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>Todas</span>
                      <span
                        className={`text-xs font-black ${selectedCategory === '' ? 'text-white/70' : 'text-slate-400'}`}
                      >
                        {categories.reduce((sum, c) => sum + (c._count?.products ?? 0), 0)}
                      </span>
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          selectedCategory === cat.slug
                            ? 'bg-red-600 text-white'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span
                          className={`text-xs font-black ${selectedCategory === cat.slug ? 'text-white/70' : 'text-slate-400'}`}
                        >
                          {cat._count?.products ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Faixa de Preço
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold">Mín</label>
                      <input
                        type="number"
                        placeholder="R$ 0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold">Máx</label>
                      <input
                        type="number"
                        placeholder="R$ 9999"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500"
                        min="0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => { setPage(1); fetchProducts(); }}
                    className="mt-3 w-full bg-slate-900 hover:bg-red-600 text-white text-xs font-bold uppercase py-2.5 rounded-xl transition-colors"
                  >
                    Aplicar Filtro
                  </button>
                </div>

                {/* Clear */}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:bg-red-50 py-2.5 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => setShowFilters(true)}
                className="md:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold hover:border-red-500 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {hasFilters && (
                  <span className="bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                    !
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3 ml-auto">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-semibold focus:outline-none focus:border-red-500 text-slate-700"
                >
                  <option value="">Relevância</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>

                <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filters chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-6">
                {search && (
                  <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    Busca: "{search}"
                    <button onClick={() => { setSearch(''); setPage(1); fetchProducts(); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                    <button onClick={() => { setSelectedCategory(''); setPage(1); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    R$ {minPrice || '0'} — R$ {maxPrice || '∞'}
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1); fetchProducts(); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Products */}
            {loading ? (
              <div
                className={`grid gap-4 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                    <div className="skeleton aspect-square" />
                    <div className="p-4 space-y-3">
                      <div className="skeleton h-3 w-1/3 rounded-lg" />
                      <div className="skeleton h-4 w-full rounded-lg" />
                      <div className="skeleton h-4 w-2/3 rounded-lg" />
                      <div className="skeleton h-8 w-full rounded-xl mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl mb-6">
                  📦
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-slate-400 text-sm mb-8 max-w-xs">
                  {hasFilters
                    ? 'Tente ajustar os filtros ou faça uma nova busca.'
                    : 'Nenhum produto cadastrado no momento.'}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="bg-red-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-4 ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1'
                  }`}
                >
                  {products.map((product) =>
                    viewMode === 'grid' ? (
                      /* GRID CARD */
                      <Link
                        key={product.id}
                        href={`/produto/${product.slug}`}
                        className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                      >
                        <div className="relative aspect-square bg-slate-50 overflow-hidden">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-contain mix-blend-multiply p-4 group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                              📦
                            </div>
                          )}
                          {product.stock > 0 && (
                            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                              Em estoque
                            </div>
                          )}
                          <button
                            onClick={(e) => toggleWish(e, product.id)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center shadow-sm"
                          >
                            <Heart
                              className={`w-4 h-4 ${wishedIds.has(product.id) ? 'fill-red-600 text-red-600' : 'text-slate-300'}`}
                            />
                          </button>
                          <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={(e) => handleAddToCart(e, product)}
                              disabled={addingId === product.id || product.stock === 0}
                              className="w-full bg-slate-900 hover:bg-red-600 text-white text-[11px] font-bold uppercase py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {addingId === product.id ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  {product.stock > 0 ? 'Adicionar' : 'Esgotado'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">
                            {product.category?.name}
                          </p>
                          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-3 flex-1 group-hover:text-red-600 transition-colors">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          <p className="text-xl font-black text-slate-900">
                            R$ <span className="text-red-600">{product.price.toFixed(2).replace('.', ',')}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            ou 12x de R$ {(product.price / 12).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      /* LIST CARD */
                      <Link
                        key={product.id}
                        href={`/produto/${product.slug}`}
                        className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all flex gap-0"
                      >
                        <div className="relative w-40 sm:w-52 shrink-0 bg-slate-50 overflow-hidden">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-contain mix-blend-multiply p-4 group-hover:scale-105 transition-transform duration-500"
                              sizes="200px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                          <div>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">
                              {product.category?.name}
                            </p>
                            <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                            <div>
                              <p className="text-2xl font-black text-slate-900">
                                R$ <span className="text-red-600">{product.price.toFixed(2).replace('.', ',')}</span>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                12x R$ {(product.price / 12).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleAddToCart(e, product)}
                              disabled={addingId === product.id || product.stock === 0}
                              className="flex items-center gap-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold uppercase px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              {product.stock > 0 ? 'Adicionar' : 'Esgotado'}
                            </button>
                          </div>
                        </div>
                      </Link>
                    )
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:text-red-600 disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                            page === p
                              ? 'bg-red-600 text-white'
                              : 'bg-white border border-slate-200 hover:border-red-400 text-slate-600'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:text-red-600 disabled:opacity-40 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer estilo Decar */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-black">MACO<span className="text-red-500">FEL</span></span>
              </div>
              <p className="text-gray-400 text-sm mb-4">Materiais para Construção de qualidade em Parapuã e região.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>📍 Av. São Paulo, 699 - Centro</p>
                <p>Parapuã - SP, 17730-000</p>
                <p>📞 (18) 99814-5495</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Institucional</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">Sobre nós</Link></li>
                <li><Link href="#" className="hover:text-white">Política de Privacidade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Atendimento</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">Fale Conosco</Link></li>
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
      
      {/* WhatsApp Floating */}
      <a
        href="https://wa.me/5518998145495?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20MACOFEL%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-bold text-sm">Fale conosco</span>
      </a>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>}>
      <CatalogoContent />
    </Suspense>
  );
}
