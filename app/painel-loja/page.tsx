import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';
import { resolvePdvInstallerDownloadUrl } from '@/lib/pdv-installer-url';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Painel da loja | Macofel',
  description: 'Área do vendedor e gerente de loja',
};

export default async function PainelLojaHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== 'STORE_MANAGER' && role !== 'SELLER')) {
    redirect('/login?callbackUrl=/painel-loja');
  }

  const isGerente = role === 'STORE_MANAGER';
  const installerUrl = resolvePdvInstallerDownloadUrl();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel da loja</h1>
        <p className="mt-2 text-slate-600">
          {isGerente
            ? 'Como gerente, tem acesso ao PDV e às funções de gestão da loja (estoque físico, caixas, relatórios, etc.).'
            : 'Como vendedor, use o PDV no navegador ou a app desktop para vendas; aqui encontra atalhos e o instalador.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/loja"
          className="rounded-xl border border-sky-200 bg-white p-5 shadow-sm transition hover:border-sky-400"
        >
          <p className="font-semibold text-sky-900">PDV no navegador</p>
          <p className="mt-1 text-sm text-slate-600">Abrir o caixa em ecrã completo (/loja).</p>
        </Link>
        {installerUrl ? (
          <a
            href={installerUrl}
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition hover:border-emerald-400"
          >
            <p className="font-semibold text-emerald-900">Instalador Windows</p>
            <p className="mt-1 text-sm text-slate-600">Descarregar PDV Desktop para o PC do caixa.</p>
          </a>
        ) : null}
      </div>

      {isGerente && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-950">
          <p className="font-semibold">Permissões de gerente (neste site)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {hasPermission(role, 'store:physical_stock') && (
              <li>
                <Link href="/painel-loja/estoque/alertas" className="underline hover:no-underline">
                  Estoque físico
                </Link>{' '}
                — alertas, movimentações, importação e relatórios.
              </li>
            )}
            {hasPermission(role, 'store:approve_returns') && (
              <li>Trocas e devoluções — módulo em evolução (página de apoio).</li>
            )}
            {hasPermission(role, 'store:pdv_cash_register_config') && (
              <li>Configuração de caixas PDV — UI dedicada em breve.</li>
            )}
            {hasPermission(role, 'store:lock_unlock_registers') && (
              <li>Bloquear / desbloquear registos — UI dedicada em breve.</li>
            )}
            {hasPermission(role, 'store:store_reports') && (
              <li>
                <Link href="/painel-loja/relatorios-loja" className="underline hover:no-underline">
                  Relatórios da loja
                </Link>
                .
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
