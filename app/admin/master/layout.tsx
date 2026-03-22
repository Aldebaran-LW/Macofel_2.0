'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MasterAdminSubnav from '@/components/master-admin-subnav';
import { isMasterAdminRole } from '@/lib/permissions';

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading' && (!session?.user || !isMasterAdminRole((session.user as any)?.role))) {
      router.replace('/admin/dashboard?master=forbidden');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!session?.user || !isMasterAdminRole((session.user as any)?.role)) {
    return null;
  }

  return (
    <div>
      <MasterAdminSubnav />
      {children}
    </div>
  );
}
