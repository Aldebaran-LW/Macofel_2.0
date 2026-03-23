import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Package } from 'lucide-react';
import { resolvePdvInstallerDownloadUrl } from '@/lib/pdv-installer-url';

export const metadata = {
  title: 'PDV Desktop — Download | Master',
  description: 'Instalador Windows do PDV Macofel para lojas',
};

export default function MasterPdvDesktopPage() {
  const downloadUrl = resolvePdvInstallerDownloadUrl();
  const version = process.env.PDV_DESKTOP_INSTALLER_VERSION?.trim() || '0.1.0';
  const fileName =
    process.env.PDV_DESKTOP_INSTALLER_FILENAME?.trim() ||
    'pdv-macofel-setup.exe';

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/master/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Painel Master
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        PDV Macofel — instalador Windows
      </h1>
      <p className="mb-8 text-gray-600">
        Descarregue o programa de caixa (offline + sincronização com este site) para
        instalar no PC da loja. Apenas utilizadores Master devem distribuir este link.
      </p>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Package className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Versão indicada</p>
            <p className="text-sm text-gray-600">{version} (NSIS ou MSI conforme build)</p>
          </div>
        </div>

        {downloadUrl ? (
          <>
            <a
              href={downloadUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:w-auto"
            >
              <Download className="h-5 w-5" />
              Descarregar instalador
              <ExternalLink className="h-4 w-4 opacity-80" />
            </a>
            <p className="mt-3 text-xs text-gray-600 break-all">
              Destino: {downloadUrl}
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Download ainda não configurado no servidor</p>
            <p className="mt-2 text-amber-900/90">
              Defina na Vercel (ou <code className="rounded bg-white/80 px-1">.env</code>){' '}
              <strong>PDV_DESKTOP_INSTALLER_URL</strong> com o link completo do ficheiro
              (ex.: GitHub Release ou CDN), ou coloque o <code>.exe</code> em{' '}
              <code className="rounded bg-white/80 px-1">public/downloads/</code> e use{' '}
              <strong>PDV_DESKTOP_INSTALLER_PATH</strong>
              <code className="ml-1 rounded bg-white/80 px-1">/downloads/pdv-macofel-setup.exe</code>{' '}
              juntamente com <strong>NEXTAUTH_URL</strong> correto.
            </p>
            <p className="mt-2 text-xs text-amber-800/80">
              Ver <code>public/downloads/README.md</code> no repositório Macofel e o README do
              projeto PDV-Macofel.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <h2 className="text-base font-semibold text-gray-900">No PC do cliente</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Executar o instalador como utilizador com permissão de instalação.</li>
          <li>
            Se o Windows (SmartScreen) avisar “editor desconhecido”, usar “Mais informações” →
            “Executar mesmo assim”, se a origem for confiável.
          </li>
          <li>
            Copiar o ficheiro <code className="rounded bg-gray-100 px-1">.env</code> do PDV
            (com <code className="rounded bg-gray-100 px-1">MACOFEL_API_KEY</code> e URL do
            site) para a pasta de instalação ou configurar conforme o guia do PDV.
          </li>
          <li>Abrir o PDV, definir utilizador e senha locais do caixa.</li>
        </ol>
      </div>
    </div>
  );
}
