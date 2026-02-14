'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingCart, User, LogOut, Package, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession() ?? {};
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session?.user) {
      fetchCartCount();
    }
  }, [mounted, session]);

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
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative h-10 w-32">
              <Image
                src="/logo.jpeg"
                alt="MACOFEL Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
            >
              Início
            </Link>
            <Link
              href="/catalogo"
              className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
            >
              Catálogo
            </Link>
            {session?.user && (
              <Link
                href="/meus-pedidos"
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                Meus Pedidos
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : session?.user ? (
              <>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      <Package className="h-4 w-4 mr-2" />
                      Painel Admin
                    </Button>
                  </Link>
                )}
                {!isAdmin && (
                  <Link href="/carrinho" className="relative">
                    <Button variant="outline" size="icon">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
                <Link href="/perfil">
                  <Button variant="outline" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t">
            <Link
              href="/"
              className="block py-2 text-sm font-medium text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </Link>
            <Link
              href="/catalogo"
              className="block py-2 text-sm font-medium text-gray-700 hover:text-red-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Catálogo
            </Link>
            {session?.user && (
              <Link
                href="/meus-pedidos"
                className="block py-2 text-sm font-medium text-gray-700 hover:text-red-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Meus Pedidos
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="block py-2 text-sm font-medium text-gray-700 hover:text-red-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Painel Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
