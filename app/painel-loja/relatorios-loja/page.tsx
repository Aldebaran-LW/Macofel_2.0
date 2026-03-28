import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';
import { PainelLojaPlaceholderPage } from '@/components/painel-loja-placeholder-page';

export const metadata = {
  title: 'Relatórios da loja | Painel da loja',
};

export default async function RelatoriosLojaPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPermission(role, 'store:store_reports')) {
    redirect('/painel-loja');
  }

  const stock = hasPermission(role, 'store:physical_stock');

  return (
    <PainelLojaPlaceholderPage title="Relatórios da loja">
      <p className="mb-4">
        Relatórios operacionais e de loja. Hoje o relatório de inventário / stock está no módulo de
        estoque físico.
      </p>
      {stock ? (
        <Link
          href="/painel-loja/estoque/relatorios"
          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Abrir relatórios de estoque
        </Link>
      ) : (
        <p className="text-sm text-slate-500">Sem acesso ao módulo de estoque nesta conta.</p>
      )}
    </PainelLojaPlaceholderPage>
  );
}
