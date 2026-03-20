'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import ClientSidebar from '@/components/client-sidebar';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-3 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-gray-800 hover:bg-gray-100"
          aria-label="Abrir menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <span className="truncate font-bold text-gray-900">
          Minha conta <span className="text-red-600">MACOFEL</span>
        </span>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
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
          className="absolute right-1 top-3 z-[60] text-gray-700 hover:bg-gray-100 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <ClientSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col p-4 pt-16 lg:min-h-0 lg:p-8 lg:pt-8">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
