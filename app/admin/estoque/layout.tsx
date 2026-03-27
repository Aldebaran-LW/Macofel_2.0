import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isMasterAdminRole } from '@/lib/permissions';
import MasterAdminSubnav from '@/components/master-admin-subnav';

export default async function AdminEstoqueLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const showMasterNav = isMasterAdminRole(role);

  return (
    <div className="space-y-2">
      {showMasterNav ? <MasterAdminSubnav /> : null}
      {children}
    </div>
  );
}
