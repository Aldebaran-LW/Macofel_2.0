'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { isOperationalStaffRole } from '@/lib/permissions';

/**
 * Área mínima para funções de equipa fora do /admin (ex.: vincular Telegram)
 * acessível a qualquer papel não-CLIENT.
 */
export default function EquipaLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      const dest = pathname || '/equipa';
      router.replace(`/login?callbackUrl=${encodeURIComponent(dest)}`);
      return;
    }
    if (session?.user) {
      const role = (session.user as { role?: string }).role;
      if (!isOperationalStaffRole(role)) {
        router.replace('/');
      }
    }
  }, [session, status, router, pathname]);

  if (status === 'loading' || status === 'unauthenticated' || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
          <p className="text-slate-600">A carregar…</p>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  if (!isOperationalStaffRole((session.user as { role?: string }).role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      {children}
      <Toaster position="top-right" richColors />
    </div>
  );
}
