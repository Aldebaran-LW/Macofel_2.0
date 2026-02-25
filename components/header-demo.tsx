'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, User, Search, Percent, Menu, X, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function HeaderDemo() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession() ?? {};
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    setMounted(true);
    fetchCategories();
  }, []);

  useEffect(() => {
    if (mounted && session?.user) {
      fetchCartCount();
    }
  }, [mounted, session]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data?.slice(0, 6) ?? []);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCartCount(data?.items?.length ?? 0);
      }
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso');
      window.location.href = '/';
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalogo?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* Promo Top Bar */}
      <div className="promo-banner text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2 text-center">
        Compre online e levante em loja em menos de 2 horas • Frete grátis em compras acima de 150€
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          {/* Top Row */}
          <div className="flex justify-between items-center h-20 gap-8">
            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center gap-3">
              <div className="relative h-10 w-auto">
                <Image
                  src="/logo-macofel.png"
                  alt="MACOFEL"
                  width={40}
                  height={40}
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-2xl font-bold tracking-tighter italic">
                Macofel<span className="text-red-600">.</span>
              </span>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
              <input
                type="text"
                placeholder="O que procura para a sua obra? (ex: cimento, torneiras...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-full py-3 px-6 text-sm focus:ring-2 focus:ring-red-600 transition-all outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 top-1.5 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Account/Cart */}
            <div className="flex items-center gap-6">
              <a href="tel:+351234000000" className="hidden lg:flex flex-col items-end leading-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Apoio ao Cliente</span>
                <span className="text-sm font-black">+351 234 000</span>
              </a>
              {status === 'loading' ? (
                <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
              ) : session?.user ? (
                <>
                  <Link href="/perfil" className="relative group">
                    <User className="w-6 h-6 text-slate-600 group-hover:text-red-600 transition-colors" />
                  </Link>
                  {!isAdmin && (
                    <Link href="/carrinho" className="relative group">
                      <ShoppingCart className="w-6 h-6 text-slate-600 group-hover:text-red-600 transition-colors" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-slate-600 hover:text-red-600 transition-colors text-xs font-bold uppercase"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-slate-600 hover:text-red-600 transition-colors text-xs font-bold uppercase">
                    Entrar
                  </Link>
                  <button
                    className="lg:hidden p-2"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Categories Nav */}
          <nav className="flex items-center gap-8 h-12 overflow-x-auto category-scroll border-t border-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Link href="/catalogo" className="text-red-600 whitespace-nowrap border-b-2 border-red-600 h-full flex items-center">
              Todas as Categorias
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?category=${category.slug}`}
                className="hover:text-black whitespace-nowrap transition-colors"
              >
                {category.name}
              </Link>
            ))}
            <Link href="/catalogo?outlet=true" className="ml-auto text-red-600 flex items-center gap-2">
              <Percent className="w-3 h-3" /> Outlet
            </Link>
          </nav>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-2 border-t border-slate-200 bg-white">
            <Link
              href="/catalogo"
              className="block py-2 px-4 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Todas as Categorias
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?category=${category.slug}`}
                className="block py-2 px-4 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {category.name}
              </Link>
            ))}
            {!session?.user && (
              <div className="pt-4 border-t border-slate-200 space-y-2 px-4">
                <Link
                  href="/login"
                  className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
