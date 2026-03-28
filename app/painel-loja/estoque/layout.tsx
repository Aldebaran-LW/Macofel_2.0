import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';

export default async function PainelLojaEstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPermission(role, 'store:physical_stock')) {
    redirect('/painel-loja');
  }

  return <div className="space-y-2">{children}</div>;
}
