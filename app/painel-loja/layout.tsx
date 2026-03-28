'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { PainelLojaSidebar } from '@/components/painel-loja-sidebar';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isPainelLojaRole } from '@/lib/permissions';

export default function PainelLojaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    if (status !== 'loading' && session?.user) {
      const role = (session.user as { role?: string }).role;
      if (!isPainelLojaRole(role)) {
        router.replace('/');
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="text-slate-600">A carregar…</p>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  if (!isPainelLojaRole((session.user as { role?: string }).role)) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 text-white shadow-md lg:hidden">
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
        <span className="truncate font-bold text-emerald-400">Painel da loja</span>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
        <PainelLojaSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <main className="min-h-screen min-w-0 flex-1 flex-col p-4 pt-16 lg:p-8 lg:pt-8">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
