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
    'PDV.Macofel_0.1.0_x64_en-US.msi';

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
              <strong>PDV_DESKTOP_INSTALLER_URL</strong> com o link direto do instalador (ex.: asset
              de um GitHub Release). Release <strong>PDV Macofel 0.1.0</strong> (tag{' '}
              <code className="rounded bg-white/80 px-1">pdv-v0.1.0</code>):
            </p>
            <p className="mt-2 break-all rounded bg-white/90 px-2 py-1.5 font-mono text-[11px] text-amber-950">
              https://github.com/Aldebaran-LW/PDV-Macofel/releases/download/pdv-v0.1.0/PDV.Macofel_0.1.0_x64_en-US.msi
            </p>
            <p className="mt-2 text-amber-900/90">
              Opcional: <strong>PDV_DESKTOP_INSTALLER_FILENAME</strong> para o atributo{' '}
              <code className="rounded bg-white/80 px-1">download</code>. Alternativa: ficheiro em{' '}
              <code className="rounded bg-white/80 px-1">public/downloads/</code> +{' '}
              <strong>PDV_DESKTOP_INSTALLER_PATH</strong> (ex.{' '}
              <code className="rounded bg-white/80 px-1">/downloads/instalador.msi</code>).
            </p>
            <p className="mt-2 text-xs text-amber-800/80">
              Ver <code>public/downloads/README.md</code> no repositório Macofel e o README do
              projeto PDV-Macofel.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">PDV Web no site (/loja)</h2>
        <p className="mt-2 text-sm text-gray-600">
          O caixa no browser usa ficheiros estáticos em{' '}
          <code className="rounded bg-gray-100 px-1">public/loja</code>, gerados pelo projeto{' '}
          <strong>PDV-Macofel</strong> — <strong>não</strong> pela build do Next.js. Se o /loja parecer antigo,
          falta atualizar esse embed e fazer deploy.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600">
          <li>
            Coloque o código do <strong>PDV-Macofel</strong> ao lado deste repositório (pasta irmã{' '}
            <code className="rounded bg-gray-100 px-1">PDV-Macofel</code>) ou defina a variável de ambiente{' '}
            <code className="rounded bg-gray-100 px-1">PDV_MACOFEL_ROOT</code> com o caminho absoluto.
          </li>
          <li>
            Na raiz do site Macofel: <code className="rounded bg-gray-100 px-1">npm run pdv:embed</code> (executa{' '}
            <code className="rounded bg-gray-100 px-1">build:embed</code> no PDV-Macofel e copia para{' '}
            <code className="rounded bg-gray-100 px-1">public/loja</code>).
          </li>
          <li>
            Commit de <code className="rounded bg-gray-100 px-1">public/loja/</code> (inclui{' '}
            <code className="rounded bg-gray-100 px-1">embed-version.txt</code>) e push. Na Vercel pode usar{' '}
            <code className="rounded bg-gray-100 px-1">PDV_WEB_EMBED_VERSION</code> para invalidar cache sem
            mexer em ficheiros.
          </li>
        </ol>
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
