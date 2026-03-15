'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import AdminSidebar from '@/components/admin-sidebar';
import { Toaster } from 'sonner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoginPage = pathname === '/admin/login';

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
      <AdminSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
