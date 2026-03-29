import Link from 'next/link';
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
      {showMasterNav ? (
        <>
          <MasterAdminSubnav />
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">
              Master
            </span>
            <Link
              href="/admin/master/buscar-produto"
              className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
            >
              Buscar produto (EAN / fotos)
            </Link>
            <Link
              href="/admin/master/exportacao"
              className="inline-flex items-center rounded-md border border-amber-700 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
            >
              Exportação de dados
            </Link>
          </div>
        </>
      ) : null}
      {children}
    </div>
  );
}
