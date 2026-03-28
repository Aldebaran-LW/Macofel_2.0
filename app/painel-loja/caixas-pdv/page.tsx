import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';
import { PainelLojaPlaceholderPage } from '@/components/painel-loja-placeholder-page';

export const metadata = {
  title: 'Caixas PDV | Painel da loja',
};

export default async function CaixasPdvPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPermission(role, 'store:pdv_cash_register_config')) {
    redirect('/painel-loja');
  }

  return (
    <PainelLojaPlaceholderPage title="Configuração de caixas PDV">
      <p>
        Área reservada à configuração de terminais e parâmetros de caixa. A implementação web será
        ligada ao PDV desktop e às políticas definidas em Admin quando estiver disponível.
      </p>
    </PainelLojaPlaceholderPage>
  );
}
