'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  Phone,
  ChevronDown,
  Truck,
  Shield,
  Clock,
  Hammer,
  Layers,
  Zap,
  Package,
  LogOut,
  Heart,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cimento: <Layers className="w-5 h-5" />,
  ferramentas: <Hammer className="w-5 h-5" />,
  eletrica: <Zap className="w-5 h-5" />,
  default: <Package className="w-5 h-5" />,
};

export default function HeaderV2() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession() ?? {};
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (mounted && session?.user) {
      fetchCartCount();
    }
  }, [mounted, session]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data?.slice(0, 8) ?? []);
      }
    } catch {}
  };

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCartCount(data?.items?.length ?? 0);
      }
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso');
      window.location.href = '/';
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalogo?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getCategoryIcon = (slug: string) => {
    return CATEGORY_ICONS[slug] ?? CATEGORY_ICONS['default'];
  };

  return (
    <>
      {/* Announcement Bar */}
      {showBanner && (
        <div className="v2-announcement-bar relative flex items-center justify-center py-2.5 px-4 text-white text-xs font-semibold">
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <span className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5" />
              Frete grátis acima de R$&nbsp;150
            </span>
            <span className="hidden sm:block text-white/40">•</span>
            <span className="hidden sm:flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Pagamento 100% seguro
            </span>
            <span className="hidden md:block text-white/40">•</span>
            <span className="hidden md:flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Retire em loja em até 2h
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <header
        className={`sticky top-0 z-[9999] isolate bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-lg shadow-black/5' : 'border-b border-slate-100'
        }`}
      >
        {/* Top Row */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 md:gap-8 h-[72px]">
            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center gap-3 group">
              <div className="relative w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center overflow-hidden group-hover:bg-red-700 transition-colors">
                <Image
                  src="/logo-macofel.png"
                  alt="MACOFEL"
                  width={32}
                  height={32}
                  className="object-contain invert"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="absolute text-white font-black text-xs italic">M</span>
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-xl font-black tracking-tighter text-slate-900 italic uppercase">
                  MACO<span className="text-red-600">FEL</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-[0.18em] uppercase">
                  Materiais p/ Construção
                </span>
              </div>
            </Link>

            {/* Search */}
            <form
              onSubmit={handleSearch}
              className={`flex-1 relative transition-all duration-200 ${searchFocused ? 'max-w-3xl' : 'max-w-2xl'}`}
            >
              <input
                type="text"
                placeholder="Buscar produto, categoria ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-5 pr-14 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              {/* Phone (desktop) */}
              <a
                href="tel:+551133333333"
                className="hidden xl:flex flex-col items-end leading-none text-right"
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Fale Conosco
                </span>
                <span className="text-sm font-black text-slate-800 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-red-600" />
                  (11) 3333-3333
                </span>
              </a>

              {status === 'loading' ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
              ) : session?.user ? (
                <>
                  <Link
                    href="/perfil"
                    className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-slate-50"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-bold hidden sm:block">Conta</span>
                  </Link>
                  {!isAdmin && (
                    <Link
                      href="/carrinho"
                      className="relative flex flex-col items-center gap-0.5 text-slate-600 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-slate-50"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span className="text-[9px] font-bold hidden sm:block">Carrinho</span>
                      {cartCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden md:flex text-[10px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="hidden md:flex flex-col items-center gap-0.5 text-slate-400 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-slate-50"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-[9px] font-bold hidden sm:block">Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50"
                  >
                    <User className="w-4 h-4" />
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="hidden md:flex items-center gap-2 text-xs font-bold bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Criar Conta
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-slate-50"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-slate-700" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Categories Nav */}
          <nav className="hidden md:flex items-center gap-0 border-t border-slate-100 overflow-x-auto relative z-[9999] bg-white">
            {/* Mega menu trigger */}
            <div ref={megaRef} className="relative">
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMegaMenuOpen(false);
                }}
                aria-label="Abrir menu de departamentos"
                aria-expanded={megaMenuOpen}
                aria-haspopup="true"
                aria-controls="mega-menu-departamentos"
                disabled={categories.length === 0}
                className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                  megaMenuOpen
                    ? 'bg-red-700 shadow-lg'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Menu className="w-4 h-4" />
                Departamentos
                {categories.length > 0 && (
                  <span className="ml-1 bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {categories.length}
                  </span>
                )}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    megaMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Mega Dropdown */}
              {megaMenuOpen && categories.length > 0 && (
                <div
                  id="mega-menu-departamentos"
                  className="absolute top-full left-0 z-[9999] bg-white shadow-2xl rounded-b-2xl border border-slate-100 w-[600px] p-6 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/catalogo?category=${cat.slug}`}
                      onClick={() => setMegaMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all group"
                    >
                      <span className="w-9 h-9 bg-slate-100 group-hover:bg-red-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-red-600 transition-all shrink-0">
                        {getCategoryIcon(cat.slug)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-red-600">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href="/catalogo"
                    onClick={() => setMegaMenuOpen(false)}
                    className="col-span-2 mt-2 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-red-400 text-xs font-bold uppercase text-slate-400 hover:text-red-600 transition-all"
                  >
                    Ver todas as categorias →
                  </Link>
                </div>
              )}
            </div>

            {/* Quick nav links */}
            <div className="flex items-center overflow-x-auto">
              {categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalogo?category=${cat.slug}`}
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-red-600"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center">
              <Link
                href="/meus-pedidos"
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 border-transparent ${session?.user ? 'text-slate-500 hover:text-red-600 hover:border-red-600' : 'hidden'}`}
              >
                Meus Pedidos
              </Link>
              <Link
                href="/catalogo?outlet=true"
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-red-600 whitespace-nowrap flex items-center gap-1 border-b-2 border-red-600"
              >
                🔥 Ofertas
              </Link>
            </div>
          </nav>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white shadow-xl">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="px-4 py-4 border-b border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white p-2 rounded-lg"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Mobile links */}
            <div className="px-4 py-4 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Categorias
              </p>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalogo?category=${cat.slug}`}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                    {getCategoryIcon(cat.slug)}
                  </span>
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/catalogo"
                className="flex items-center gap-3 py-3 px-3 rounded-xl bg-red-50 text-sm font-bold text-red-600 mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ver Todo o Catálogo →
              </Link>
            </div>

            {/* Mobile account */}
            <div className="px-4 py-4 border-t border-slate-100 space-y-1">
              {session?.user ? (
                <>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 text-sm font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4 text-slate-500" /> Minha Conta
                  </Link>
                  {!isAdmin && (
                    <Link
                      href="/carrinho"
                      className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 text-sm font-semibold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="w-4 h-4 text-slate-500" /> Carrinho{' '}
                      {cartCount > 0 && (
                        <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    href="/meus-pedidos"
                    className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 text-sm font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="w-4 h-4 text-slate-500" /> Meus Pedidos
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-red-50 text-sm font-semibold text-red-600 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-900 text-sm font-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Criar Conta Grátis
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
