'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: {
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function CatalogoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, search, selectedCategory, minPrice, maxPrice]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data ?? []);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });

      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data?.products ?? []);
        setTotalPages(data?.pagination?.totalPages ?? 1);
      } else {
        toast.error('Erro ao buscar produtos');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Produtos</h1>
          <p className="text-gray-600">Encontre tudo o que precisa para sua obra</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </form>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside
            className={`${
              showFilters ? 'block' : 'hidden'
            } md:block w-full md:w-64 space-y-6`}
          >
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">Categorias</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setPage(1);
                    }}
                    className={`block w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedCategory === ''
                        ? 'bg-red-100 text-red-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    Todas ({categories?.reduce?.((sum, cat) => sum + (cat?._count?.products ?? 0), 0) ?? 0})
                  </button>
                  {categories?.map?.((cat) => (
                    <button
                      key={cat?.id}
                      onClick={() => {
                        setSelectedCategory(cat?.slug ?? '');
                        setPage(1);
                      }}
                      className={`block w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                        selectedCategory === cat?.slug
                          ? 'bg-red-100 text-red-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {cat?.name} ({cat?._count?.products ?? 0})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">Faixa de Preço</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="minPrice" className="text-sm">Preço Mínimo</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="R$ 0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPrice" className="text-sm">Preço Máximo</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="R$ 9999"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setPage(1);
                      fetchProducts();
                    }}
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>

              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-6 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (products?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products?.map?.((product) => (
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
