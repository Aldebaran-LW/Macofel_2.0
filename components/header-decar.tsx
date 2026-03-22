'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  Percent,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { isAdminDashboardRole } from '@/lib/permissions';

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

export default function HeaderDecar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession() ?? {};
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPixBanner, setShowPixBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 155, left: 32 });
  const megaRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminDashboardRole((session?.user as any)?.role);

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

  useEffect(() => {
    if (!megaMenuOpen || !megaRef.current) return;

    const updatePosition = () => {
      if (megaRef.current) {
        const rect = megaRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom, left: rect.left });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    updatePosition();

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [megaMenuOpen]);

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
      {/* PIX Discount Banner */}
      {showPixBanner && (
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 py-3 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            }} />
          </div>
          <div className="max-w-[1600px] mx-auto relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Percent className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-sm md:text-base uppercase tracking-tight">
                    Desconto Especial no PIX. Economize Agora!
                  </p>
                  <p className="text-emerald-50 text-xs font-semibold hidden md:block">
                    Cadastro feito, economia garantida. Pague no PIX e receba 10% de Desconto!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/cadastro"
                  className="bg-white text-emerald-600 font-bold px-4 py-2 rounded-lg hover:bg-emerald-50 transition-all uppercase text-xs tracking-wider whitespace-nowrap"
                >
                  Cadastrar
                </Link>
                <button
                  onClick={() => setShowPixBanner(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Bar */}
      <div className="bg-slate-900 text-white py-2 px-4 text-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-6 flex-wrap">
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
      </div>

      {/* Main Header */}
      <header
        style={{ position: 'sticky', top: 0, zIndex: 9999 }}
        className={`bg-white transition-shadow duration-300 ${
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
          <nav 
            style={{ position: 'relative', zIndex: 9999 }}
            className="hidden md:flex items-center border-t border-slate-100 bg-white"
          >
            {/* Mega menu trigger */}
            <div ref={megaRef} style={{ position: 'relative', zIndex: 9999 }} className="shrink-0">
              <button
                style={{ position: 'relative', zIndex: 9999 }}
                onClick={() => {
                  if (!megaMenuOpen && megaRef.current) {
                    const rect = megaRef.current.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom, left: rect.left });
                  }
                  setMegaMenuOpen(!megaMenuOpen);
                }}
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
                  style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                  className="bg-white shadow-2xl rounded-b-2xl border border-slate-100 w-[600px] p-6 grid grid-cols-2 gap-2"
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={(e) => {
                        e.preventDefault();
                        setMegaMenuOpen(false);
                        window.location.href = `/catalogo?category=${cat.slug}`;
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all group w-full text-left"
                    >
                      <span className="w-9 h-9 bg-slate-100 group-hover:bg-red-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-red-600 transition-all shrink-0">
                        {getCategoryIcon(cat.slug)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-red-600">
                        {cat.name}
                      </span>
                    </button>
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
            <div className="flex items-center overflow-x-auto flex-1">
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
