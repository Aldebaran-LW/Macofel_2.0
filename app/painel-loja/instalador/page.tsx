import { PdvDesktopInstallerPageContent } from '@/components/pdv-desktop-installer-page-content';

export const metadata = {
  title: 'PDV Desktop — Painel da loja | Macofel',
  description: 'Instalador Windows do PDV Macofel',
};

export default function PainelLojaInstaladorPage() {
  return (
    <div>
      <PdvDesktopInstallerPageContent
        backHref="/painel-loja"
        backLabel="Voltar ao painel da loja"
        audience="painel"
      />
    </div>
  );
}
