'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { isAdminDashboardRole } from '@/lib/permissions';

interface NavCategory {
  name: string;
  slug: string;
  href: string;
  isActive: boolean;
}

export default function HeaderMobile() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rawCategories, setRawCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession() ?? {};
  const currentCategory = pathname === '/catalogo' ? (searchParams?.get('category') ?? '') : '';

  const isAdmin = isAdminDashboardRole((session?.user as any)?.role);
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Array<{ id: string; name: string; slug: string }>) => {
        if (cancelled || !Array.isArray(list)) return;
        setRawCategories(list.map((c) => ({ name: c.name, slug: c.slug })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || isAdmin) {
      setCartCount(0);
      return;
    }
    let cancelled = false;
    fetch('/api/cart', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.items) setCartCount(data.items.length);
      })
      .catch(() => {
        if (!cancelled) setCartCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [status, isAdmin, pathname]);

  const categories: NavCategory[] = [
    ...rawCategories.map((c) => ({
      name: c.name,
      slug: c.slug,
      href: `/catalogo?category=${encodeURIComponent(c.slug)}`,
      isActive: currentCategory === c.slug,
    })),
    { name: '+ Categorias', slug: '', href: '/catalogo', isActive: !currentCategory },
  ];

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso');
      setMobileMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

  const cartBadge = (n: number) => (n > 99 ? '99+' : String(n));

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-macofel.png"
              alt="MACOFEL"
              width={60}
              height={60}
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
                MACO<span className="text-red-600">FEL</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider hidden sm:block">
                Materiais para Construção
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex flex-1 max-w-2xl">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Faça uma pesquisa..."
                className="w-full border-2 border-gray-200 rounded-lg py-2 sm:py-3 px-4 pr-12 focus:border-emerald-500 focus:outline-none text-sm"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop: conta + carrinho */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {status === 'loading' ? (
              <div className="h-9 w-28 bg-gray-100 rounded animate-pulse" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-4 text-sm">
                {isAdmin ? (
                  <Link href="/admin/dashboard" className="text-gray-600 hover:text-emerald-600 font-semibold">
                    Painel admin
                  </Link>
                ) : (
                  <Link href="/minha-conta" className="text-gray-600 hover:text-emerald-600 font-semibold inline-flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Minha conta
                  </Link>
                )}
                {!isAdmin && (
                  <Link href="/carrinho" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600">
                    <ShoppingCart className="w-6 h-6" />
                    <span className="font-bold">{cartBadge(cartCount)}</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-emerald-600">
                  <span className="font-bold">Entre</span> ou<br />
                  <span className="font-bold">Cadastre-se</span>
                </Link>
                <Link href="/carrinho" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="font-bold">0</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: carrinho + hambúrguer */}
          <div className="flex md:hidden items-center gap-1">
            {!isAdmin && (
              <Link
                href="/carrinho"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 relative"
                aria-label="Carrinho"
              >
                <ShoppingCart className="w-6 h-6" />
                {isLoggedIn && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white px-1">
                    {cartBadge(cartCount)}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      <nav className="hidden md:block border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-center">
          <ul className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-6 rounded-xl bg-slate-50/90 border border-slate-100/80 px-4 py-2.5 text-sm font-semibold text-gray-700">
            {categories.map((cat) => (
              <li key={cat.slug || 'all'} className="shrink-0">
                <Link
                  href={cat.href}
                  className={
                    cat.isActive
                      ? 'text-emerald-600 font-bold whitespace-nowrap'
                      : 'hover:text-emerald-600 transition-colors whitespace-nowrap'
                  }
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="bg-white w-80 max-w-[85vw] h-full shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="text-lg font-black text-gray-800">
                MACO<span className="text-emerald-600">FEL</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Fechar menu"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 space-y-2">
              {status === 'loading' ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : isLoggedIn ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-3 px-4 bg-gray-900 text-white font-bold rounded-lg"
                    >
                      Painel administrativo
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/minha-conta"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center py-3 px-4 bg-emerald-600 text-white font-bold rounded-lg"
                      >
                        Minha conta
                      </Link>
                      <Link
                        href="/minha-conta/solicitacoes-orcamento"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center py-3 px-4 border-2 border-emerald-600 text-emerald-700 font-bold rounded-lg"
                      >
                        Solicitar orçamento
                      </Link>
                    </>
                  )}
                  <Link
                    href="/carrinho"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-bold rounded-lg"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Carrinho ({isAdmin ? 0 : cartBadge(cartCount)})
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 text-red-600 font-bold rounded-lg border border-red-200"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-3 px-4 bg-emerald-600 text-white font-bold rounded-lg"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-3 px-4 border-2 border-emerald-600 text-emerald-600 font-bold rounded-lg"
                  >
                    Cadastre-se
                  </Link>
                  <Link
                    href="/carrinho"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-bold rounded-lg"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Carrinho
                  </Link>
                </>
              )}
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Faça uma pesquisa..."
                  className="w-full border-2 border-gray-200 rounded-lg py-2.5 px-4 pr-12 focus:border-emerald-500 focus:outline-none text-sm"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Categorias</h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.slug || 'all'}>
                    <Link
                      href={cat.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-2.5 px-3 rounded-lg transition-colors ${
                        cat.isActive
                          ? 'bg-emerald-100 text-emerald-700 font-bold'
                          : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 border-t border-gray-200">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/meus-pedidos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 px-3 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    Meus Pedidos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/catalogo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 px-3 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    Catálogo Completo
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
