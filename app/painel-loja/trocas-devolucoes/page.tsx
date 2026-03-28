import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';
import { PainelLojaPlaceholderPage } from '@/components/painel-loja-placeholder-page';

export const metadata = {
  title: 'Trocas e devoluções | Painel da loja',
};

export default async function TrocasDevolucoesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPermission(role, 'store:approve_returns')) {
    redirect('/painel-loja');
  }

  return (
    <PainelLojaPlaceholderPage title="Trocas e devoluções">
      <p>
        Módulo em evolução. Aqui poderá aprovar e registar trocas e devoluções conforme a política da
        loja. Enquanto não está ligado a pedidos, use os fluxos acordados com a administração.
      </p>
    </PainelLojaPlaceholderPage>
  );
}
