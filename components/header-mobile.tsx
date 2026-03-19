'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShoppingCart, Menu, X } from 'lucide-react';

interface NavCategory {
  name: string;
  slug: string;
  href: string;
  isActive: boolean;
}

export default function HeaderMobile() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rawCategories, setRawCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = pathname === '/catalogo' ? (searchParams?.get('category') ?? '') : '';

  // Buscar categorias da mesma API do catálogo (uma vez) para slugs sincronizados
  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Array<{ id: string; name: string; slug: string }>) => {
        if (cancelled || !Array.isArray(list)) return;
        setRawCategories(list.map((c) => ({ name: c.name, slug: c.slug })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Derivar links e estado ativo a partir da URL
  const categories: NavCategory[] = [
    ...rawCategories.map((c) => ({
      name: c.name,
      slug: c.slug,
      href: `/catalogo?category=${encodeURIComponent(c.slug)}`,
      isActive: currentCategory === c.slug,
    })),
    { name: '+ Categorias', slug: '', href: '/catalogo', isActive: !currentCategory },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
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

          {/* Busca - Ocultar no mobile muito pequeno */}
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

          {/* Ações - Desktop */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <Link href="/login" className="text-sm text-gray-600 hover:text-emerald-600">
              <span className="font-bold">Entre</span> ou<br />
              <span className="font-bold">Cadastre-se</span>
            </Link>
            <Link href="/carrinho" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600">
              <ShoppingCart className="w-6 h-6" />
              <span className="font-bold">0</span>
            </Link>
          </div>

          {/* Hambúrguer - Mobile */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu de Categorias - Desktop (sincronizado com URL e API) */}
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

      {/* Menu Mobile Hambúrguer */}
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

             {/* Links de Login/Cadastro */}
             <div className="p-4 border-b border-gray-200">
               <Link
                 href="/login"
                 onClick={() => setMobileMenuOpen(false)}
                 className="block w-full text-center py-3 px-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors mb-2"
               >
                 Entrar
               </Link>
               <Link
                 href="/cadastro"
                 onClick={() => setMobileMenuOpen(false)}
                 className="block w-full text-center py-3 px-4 border-2 border-emerald-600 text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 transition-colors mb-2"
               >
                 Cadastre-se
               </Link>
               <Link
                 href="/carrinho"
                 onClick={() => setMobileMenuOpen(false)}
                 className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
               >
                 <ShoppingCart className="w-5 h-5" />
                 Carrinho (0)
               </Link>
             </div>

            {/* Busca Mobile */}
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

            {/* Categorias (sincronizado com API e URL) */}
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

            {/* Links Adicionais */}
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
