import { PdvDesktopInstallerPageContent } from '@/components/pdv-desktop-installer-page-content';

export const metadata = {
  title: 'PDV Desktop — Download | Admin',
  description: 'Instalador Windows do PDV Macofel para lojas',
};

export default function AdminPdvDesktopPage() {
  return (
    <PdvDesktopInstallerPageContent
      backHref="/admin/dashboard"
      backLabel="Voltar ao painel"
      audience="admin"
    />
  );
}
