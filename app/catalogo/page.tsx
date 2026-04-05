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
import HeaderMobile from '@/components/header-mobile';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { publicCategoryLabel } from '@/lib/category-display';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: { name: string; slug: string };
  marca?: string | null;
  subcategoria?: string | null;
  material?: string | null;
  acabamento?: string | null;
  tipo?: string | null;
  bitola?: string | null;
  voltagem?: string | null;
  onSale?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  _count: { products: number };
}

function getDisplayCategoryName(name: string | null | undefined): string {
  return publicCategoryLabel(name) ?? '';
}

function CatalogoContent() {
  const { data: session } = useSession() ?? {};
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams?.get('search') ?? '');
  const [search, setSearch] = useState(searchParams?.get('search') ?? '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') ?? '');
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<string[]>(
    searchParams?.getAll('subcategoria') ?? []
  );
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>(searchParams?.getAll('marca') ?? []);
  const [selectedMateriais, setSelectedMateriais] = useState<string[]>(
    searchParams?.getAll('material') ?? []
  );
  const [selectedAcabamentos, setSelectedAcabamentos] = useState<string[]>(
    searchParams?.getAll('acabamento') ?? []
  );
  const [selectedTipos, setSelectedTipos] = useState<string[]>(searchParams?.getAll('tipo') ?? []);
  const [selectedBitolas, setSelectedBitolas] = useState<string[]>(
    searchParams?.getAll('bitola') ?? []
  );
  const [selectedVoltagens, setSelectedVoltagens] = useState<string[]>(
    searchParams?.getAll('voltagem') ?? []
  );
  const [inStockOnly, setInStockOnly] = useState(searchParams?.get('inStock') === 'true');
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams?.get('onSale') === 'true');
  const [minPrice, setMinPrice] = useState(searchParams?.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams?.get('maxPrice') ?? '');
  const [page, setPage] = useState(parseInt(searchParams?.get('page') ?? '1') || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState(searchParams?.get('sort') ?? 'relevance');
  const [filterOptions, setFilterOptions] = useState<{
    marcas: string[];
    materiais: string[];
    acabamentos: string[];
    tipos: string[];
    bitolas: string[];
    voltagens: string[];
    subcategorias: string[];
    maxPrice: number;
  }>({
    marcas: [],
    materiais: [],
    acabamentos: [],
    tipos: [],
    bitolas: [],
    voltagens: [],
    subcategorias: [],
    maxPrice: 0,
  });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [wishedIds, setWishedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    setSearchInput(searchParams?.get('search') ?? '');
    setSearch(searchParams?.get('search') ?? '');
    setSelectedCategory(searchParams?.get('category') ?? '');
    setSelectedSubcategorias(searchParams?.getAll('subcategoria') ?? []);
    setSelectedMarcas(searchParams?.getAll('marca') ?? []);
    setSelectedMateriais(searchParams?.getAll('material') ?? []);
    setSelectedAcabamentos(searchParams?.getAll('acabamento') ?? []);
    setSelectedTipos(searchParams?.getAll('tipo') ?? []);
    setSelectedBitolas(searchParams?.getAll('bitola') ?? []);
    setSelectedVoltagens(searchParams?.getAll('voltagem') ?? []);
    setInStockOnly(searchParams?.get('inStock') === 'true');
    setOnSaleOnly(searchParams?.get('onSale') === 'true');
    setSortBy(searchParams?.get('sort') ?? 'relevance');
    setMinPrice(searchParams?.get('minPrice') ?? '');
    setMaxPrice(searchParams?.get('maxPrice') ?? '');
    setPage(parseInt(searchParams?.get('page') ?? '1') || 1);
  }, [searchParams]);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    void fetchProducts();
  }, [
    page,
    search,
    selectedCategory,
    selectedSubcategorias,
    selectedMarcas,
    selectedMateriais,
    selectedAcabamentos,
    selectedTipos,
    selectedBitolas,
    selectedVoltagens,
    inStockOnly,
    onSaleOnly,
    minPrice,
    maxPrice,
    sortBy,
  ]);
  useEffect(() => {
    fetchFilterOptions();
  }, [search, selectedCategory, selectedSubcategorias, minPrice, maxPrice, inStockOnly, onSaleOnly]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);
    selectedSubcategorias.forEach((s) => params.append('subcategoria', s));
    selectedMarcas.forEach((m) => params.append('marca', m));
    selectedMateriais.forEach((m) => params.append('material', m));
    selectedAcabamentos.forEach((a) => params.append('acabamento', a));
    selectedTipos.forEach((t) => params.append('tipo', t));
    selectedBitolas.forEach((b) => params.append('bitola', b));
    selectedVoltagens.forEach((v) => params.append('voltagem', v));
    if (inStockOnly) params.set('inStock', 'true');
    if (onSaleOnly) params.set('onSale', 'true');
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    router.replace(`/catalogo?${params.toString()}`, { scroll: false });
  }, [
    router,
    page,
    search,
    selectedCategory,
    sortBy,
    selectedSubcategorias,
    selectedMarcas,
    selectedMateriais,
    selectedAcabamentos,
    selectedTipos,
    selectedBitolas,
    selectedVoltagens,
    inStockOnly,
    onSaleOnly,
    minPrice,
    maxPrice,
  ]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?storefront=1');
      if (res.ok) setCategories(await res.json() ?? []);
    } catch {}
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      selectedSubcategorias.forEach((s) => params.append('subcategoria', s));
      selectedMarcas.forEach((m) => params.append('marca', m));
      selectedMateriais.forEach((m) => params.append('material', m));
      selectedAcabamentos.forEach((a) => params.append('acabamento', a));
      selectedTipos.forEach((t) => params.append('tipo', t));
      selectedBitolas.forEach((b) => params.append('bitola', b));
      selectedVoltagens.forEach((v) => params.append('voltagem', v));
      if (inStockOnly) params.append('inStock', 'true');
      if (onSaleOnly) params.append('onSale', 'true');
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sortBy) params.append('sort', sortBy);

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

  const fetchFilterOptions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      selectedSubcategorias.forEach((s) => params.append('subcategoria', s));
      if (inStockOnly) params.append('inStock', 'true');
      if (onSaleOnly) params.append('onSale', 'true');
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      const res = await fetch(`/api/products/filters?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setFilterOptions({
        marcas: Array.isArray(data?.marcas) ? data.marcas : [],
        materiais: Array.isArray(data?.materiais) ? data.materiais : [],
        acabamentos: Array.isArray(data?.acabamentos) ? data.acabamentos : [],
        tipos: Array.isArray(data?.tipos) ? data.tipos : [],
        bitolas: Array.isArray(data?.bitolas) ? data.bitolas : [],
        voltagens: Array.isArray(data?.voltagens) ? data.voltagens : [],
        subcategorias: Array.isArray(data?.subcategorias) ? data.subcategorias : [],
        maxPrice: Number(data?.maxPrice ?? 0),
      });
    } catch {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedCategory('');
    setSelectedSubcategorias([]);
    setSelectedMarcas([]);
    setSelectedMateriais([]);
    setSelectedAcabamentos([]);
    setSelectedTipos([]);
    setSelectedBitolas([]);
    setSelectedVoltagens([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy('relevance');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const toggleMulti = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
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
        credentials: 'include',
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

  const hasFilters =
    !!search ||
    !!selectedCategory ||
    selectedSubcategorias.length > 0 ||
    selectedMarcas.length > 0 ||
    selectedMateriais.length > 0 ||
    selectedAcabamentos.length > 0 ||
    selectedTipos.length > 0 ||
    selectedBitolas.length > 0 ||
    selectedVoltagens.length > 0 ||
    inStockOnly ||
    onSaleOnly ||
    !!minPrice ||
    !!maxPrice ||
    sortBy !== 'relevance';

  const categoriesByParent = new Map<string, Category[]>();
  for (const c of categories) {
    const key = c.parentId ? String(c.parentId) : '__root__';
    const arr = categoriesByParent.get(key) ?? [];
    arr.push(c);
    categoriesByParent.set(key, arr);
  }
  for (const [, arr] of categoriesByParent) {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  const selectedRootSlug = (() => {
    if (!selectedCategory) return '';
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    let curr = bySlug.get(selectedCategory);
    while (curr?.parentId) {
      curr = categories.find((c) => c.id === curr?.parentId);
    }
    return curr?.slug ?? selectedCategory;
  })();

  const maxCatalogPrice = Math.max(1, Math.ceil(filterOptions.maxPrice || 0));
  const minPriceNum = Math.max(0, Number(minPrice || 0));
  const maxPriceNum = Math.max(minPriceNum, Number(maxPrice || maxCatalogPrice));

  const renderCategoryButtons = (parentId: string | null, depth = 0): React.ReactNode => {
    const key = parentId ?? '__root__';
    const list = categoriesByParent.get(key) ?? [];
    if (list.length === 0) return null;
    return list.map((cat) => {
      const active = selectedCategory === cat.slug;
      return (
        <div key={cat.id}>
          <button
            onClick={() => {
              setSelectedCategory(cat.slug);
              setSelectedSubcategorias([]);
              setPage(1);
            }}
            className={`flex items-center justify-between w-full rounded-xl text-sm font-semibold transition-all ${
              active ? 'bg-red-600 text-white' : 'hover:bg-slate-50 text-slate-700'
            } ${depth === 0 ? 'px-3 py-2.5' : 'px-2 py-1.5 ml-2'}`}
          >
            <span>{`${'· '.repeat(depth)}${cat.name}`}</span>
            <span className={`text-xs font-black ${active ? 'text-white/70' : 'text-slate-400'}`}>
              {cat._count?.products ?? 0}
            </span>
          </button>
          {renderCategoryButtons(cat.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar – igual à página principal */}
      <div className="bg-emerald-600 text-white text-center py-2 text-sm font-medium">
        <span>Compre com 10% OFF no PIX!</span>
        <span className="mx-2">/</span>
        <span>Enviamos para todo o Brasil</span>
        <span className="mx-2">/</span>
        <span>Envie sua lista de materiais</span>
      </div>

      {/* Header – mesmo componente da página principal */}
      <HeaderMobile />

      {/* Service Badges – igual à página principal */}
      <div className="bg-white py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Truck className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-gray-700">Entrega rápida</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold text-gray-700">Envie sua lista de materiais</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-semibold text-gray-700">Desconto no Pix</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <ShieldCheck className="w-5 h-5 text-green-600" />
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
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
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
                      onClick={() => { setSelectedCategory(''); setSelectedSubcategorias([]); setPage(1); }}
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
                    {renderCategoryButtons(null, 0)}
                  </div>
                </div>

                {selectedCategory && filterOptions.subcategorias.length > 0 ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                      Subcategorias
                    </label>
                    <p className="text-[11px] text-slate-400 mb-2 leading-snug">
                      Grupos dentro desta categoria (opcional).
                    </p>
                    <div className="max-h-40 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                      {filterOptions.subcategorias.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedSubcategorias.includes(s)}
                            onChange={() => toggleMulti(setSelectedSubcategorias, s)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="line-clamp-2">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Ordenar por
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold focus:outline-none focus:border-red-500 text-slate-700"
                  >
                    <option value="relevance">Mais relevantes</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                    <option value="newest">Mais recentes</option>
                    <option value="best_selling">Mais vendidos</option>
                    <option value="name_asc">A - Z</option>
                  </select>
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
                  <div className="mt-3 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={maxCatalogPrice}
                      value={Math.min(minPriceNum, maxPriceNum)}
                      onChange={(e) => {
                        const nextMin = Number(e.target.value);
                        setMinPrice(String(nextMin));
                        if (maxPrice && Number(maxPrice) < nextMin) setMaxPrice(String(nextMin));
                        setPage(1);
                      }}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min={0}
                      max={maxCatalogPrice}
                      value={Math.max(minPriceNum, maxPriceNum)}
                      onChange={(e) => {
                        const nextMax = Number(e.target.value);
                        setMaxPrice(String(nextMax));
                        if (minPrice && Number(minPrice) > nextMax) setMinPrice(String(nextMax));
                        setPage(1);
                      }}
                      className="w-full"
                    />
                    <p className="text-[11px] text-slate-500">
                      Intervalo: R$ {Math.min(minPriceNum, maxPriceNum)} - R$ {Math.max(minPriceNum, maxPriceNum)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setPage(1); fetchProducts(); }}
                    className="mt-3 w-full bg-slate-900 hover:bg-red-600 text-white text-xs font-bold uppercase py-2.5 rounded-xl transition-colors"
                  >
                    Aplicar Filtro
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        setPage(1);
                      }}
                      className="h-4 w-4"
                    />
                    Em estoque
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={onSaleOnly}
                      onChange={(e) => {
                        setOnSaleOnly(e.target.checked);
                        setPage(1);
                      }}
                      className="h-4 w-4"
                    />
                    Em promoção
                  </label>
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Marca
                  </label>
                  <div className="max-h-36 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                    {filterOptions.marcas.map((m) => (
                      <label key={m} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedMarcas.includes(m)}
                          onChange={() => toggleMulti(setSelectedMarcas, m)}
                          className="h-3.5 w-3.5"
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Material
                  </label>
                  <div className="max-h-32 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                    {filterOptions.materiais.map((v) => (
                      <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedMateriais.includes(v)}
                          onChange={() => toggleMulti(setSelectedMateriais, v)}
                          className="h-3.5 w-3.5"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                    Cor / Acabamento
                  </label>
                  <div className="max-h-32 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                    {filterOptions.acabamentos.map((v) => (
                      <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedAcabamentos.includes(v)}
                          onChange={() => toggleMulti(setSelectedAcabamentos, v)}
                          className="h-3.5 w-3.5"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                {selectedRootSlug === 'material-hidraulico' ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                      Bitola
                    </label>
                    <div className="max-h-32 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                      {filterOptions.bitolas.map((v) => (
                        <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedBitolas.includes(v)}
                            onChange={() => toggleMulti(setSelectedBitolas, v)}
                            className="h-3.5 w-3.5"
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedRootSlug === 'material-eletrico' ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                      Voltagem
                    </label>
                    <div className="max-h-32 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                      {filterOptions.voltagens.map((v) => (
                        <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedVoltagens.includes(v)}
                            onChange={() => toggleMulti(setSelectedVoltagens, v)}
                            className="h-3.5 w-3.5"
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedRootSlug === 'ferramentas' ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                      Tipo
                    </label>
                    <div className="max-h-32 overflow-auto space-y-1 border border-slate-100 rounded-xl p-2">
                      {filterOptions.tipos.map((v) => (
                        <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedTipos.includes(v)}
                            onChange={() => toggleMulti(setSelectedTipos, v)}
                            className="h-3.5 w-3.5"
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                    <button
                      onClick={() => {
                        setSelectedCategory('');
                        setSelectedSubcategorias([]);
                        setPage(1);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedSubcategorias.map((s) => (
                  <span
                    key={`subcat-${s}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    <span className="max-w-[200px] truncate">Sub: {s}</span>
                    <button onClick={() => toggleMulti(setSelectedSubcategorias, s)}>
                      <X className="w-3 h-3 shrink-0" />
                    </button>
                  </span>
                ))}
                {selectedMarcas.map((m) => (
                  <span
                    key={`marca-${m}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Marca: {m}
                    <button onClick={() => toggleMulti(setSelectedMarcas, m)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedMateriais.map((m) => (
                  <span
                    key={`material-${m}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Material: {m}
                    <button onClick={() => toggleMulti(setSelectedMateriais, m)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedAcabamentos.map((a) => (
                  <span
                    key={`acab-${a}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Acab.: {a}
                    <button onClick={() => toggleMulti(setSelectedAcabamentos, a)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedTipos.map((t) => (
                  <span
                    key={`tipo-${t}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Tipo: {t}
                    <button onClick={() => toggleMulti(setSelectedTipos, t)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedBitolas.map((b) => (
                  <span
                    key={`bitola-${b}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Bitola: {b}
                    <button onClick={() => toggleMulti(setSelectedBitolas, b)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedVoltagens.map((v) => (
                  <span
                    key={`volt-${v}`}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full"
                  >
                    Voltagem: {v}
                    <button onClick={() => toggleMulti(setSelectedVoltagens, v)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {inStockOnly ? (
                  <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    Em estoque
                    <button onClick={() => setInStockOnly(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null}
                {onSaleOnly ? (
                  <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    Em promoção
                    <button onClick={() => setOnSaleOnly(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null}
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
                          {getDisplayCategoryName(product.category?.name) ? (
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">
                              {getDisplayCategoryName(product.category?.name)}
                            </p>
                          ) : null}
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
                            {getDisplayCategoryName(product.category?.name) ? (
                              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">
                                {getDisplayCategoryName(product.category?.name)}
                              </p>
                            ) : null}
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
