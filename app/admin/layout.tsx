'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import AdminSidebar from '@/components/admin-sidebar';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      if (mq.matches && mobileNavOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    // Se não for página de login, verificar autenticação
    if (!isLoginPage && status !== 'loading') {
      if (!session) {
        router.push('/admin/login');
        return;
      }
      
      const role = (session.user as any)?.role;
      if (role !== 'ADMIN') {
        router.push('/admin/login');
        return;
      }
    }
  }, [session, status, isLoginPage, router]);

  // Não mostrar sidebar na página de login
  if (isLoginPage) {
    return (
      <>
        {children}
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Se ainda está carregando ou não é admin, mostrar loading
  if (status === 'loading' || !session || (session.user as any)?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 text-white shadow-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-white hover:bg-white/10"
          aria-label="Abrir menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <span className="truncate font-bold text-red-500">Painel Admin</span>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div
        className={cn(
          'relative z-50 flex shrink-0 transition-transform duration-200 ease-out',
          'fixed inset-y-0 left-0 lg:static lg:z-auto',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-2 z-[60] text-white hover:bg-white/10 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <AdminSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col p-4 pt-16 lg:min-h-0 lg:p-8 lg:pt-8">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
