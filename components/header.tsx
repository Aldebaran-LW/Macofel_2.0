'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, User, LogOut, Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession() ?? {};
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session?.user) {
      fetchCartCount();
    }
  }, [mounted, session]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  return (
    <nav className={`fixed w-full z-50 glass-nav transition-all ${scrolled ? 'shadow-xl' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo Macofel */}
          <Link href="/" className="flex items-center gap-4">
            <div className="relative h-16 w-auto">
              <Image
                src="/logo-macofel.png"
                alt="Logo MACOFEL"
                width={64}
                height={64}
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-black font-title tracking-tighter text-slate-900 italic">
                MACO<span className="macofel-red">FEL</span>
              </span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Materiais para Construção</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8 font-bold text-xs uppercase tracking-widest">
            <Link href="#inicio" className="macofel-red">Início</Link>
            <Link href="#categorias" className="hover:text-red-600 transition-colors">Categorias</Link>
            <Link href="#produtos" className="hover:text-red-600 transition-colors">Produtos</Link>
            <Link href="#orcamento" className="hover:text-red-600 transition-colors">Orçamentos</Link>
            {session?.user && (
              <>
                <Link href="/minha-conta" className="hover:text-red-600 transition-colors">Minha Conta</Link>
                <Link href="/minha-conta/pedidos" className="hover:text-red-600 transition-colors">Meus Pedidos</Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin/dashboard" className="hover:text-red-600 transition-colors">Admin</Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative">
              <Search className="w-5 h-5" />
            </button>
            
            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : session?.user ? (
              <>
                {!isAdmin && (
                  <Link href="/carrinho" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link href="/minha-conta" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <User className="w-5 h-5" />
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95">
                  Falar com Consultor
                </Link>
                <Link href="/admin/login" className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg">
                  🔐 Admin Login
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-2 border-t border-slate-200">
            <Link
              href="#inicio"
              className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </Link>
            <Link
              href="#categorias"
              className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Categorias
            </Link>
            <Link
              href="#produtos"
              className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Produtos
            </Link>
            <Link
              href="#orcamento"
              className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Orçamentos
            </Link>
            {session?.user && (
              <>
                <Link
                  href="/minha-conta"
                  className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Minha Conta
                </Link>
                <Link
                  href="/minha-conta/pedidos"
                  className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Meus Pedidos
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="block py-2 text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-red-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            {!session?.user && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
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
      </div>
    </nav>
  );
}
