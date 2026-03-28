import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPermission } from '@/lib/permissions';
import { PainelLojaPlaceholderPage } from '@/components/painel-loja-placeholder-page';

export const metadata = {
  title: 'Registos de caixa | Painel da loja',
};

export default async function RegistosCaixaPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPermission(role, 'store:lock_unlock_registers')) {
    redirect('/painel-loja');
  }

  return (
    <PainelLojaPlaceholderPage title="Bloquear e desbloquear registos">
      <p>
        Função prevista para o gerente bloquear ou libertar caixas/registos. Será integrada com o PDV
        e o backoffice quando o fluxo estiver definido.
      </p>
    </PainelLojaPlaceholderPage>
  );
}
