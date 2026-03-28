'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isAdminDashboardRole, isPainelLojaRole } from '@/lib/permissions';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/admin/login');
    } else if (isAdminDashboardRole((session.user as any)?.role)) {
      router.push('/admin/dashboard');
    } else if (isPainelLojaRole((session.user as any)?.role)) {
      router.push('/painel-loja');
    } else {
      router.push('/admin/login');
    }
  }, [router, session, status]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );
}
