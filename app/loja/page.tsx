import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { hasPdvFullWebAccess, isMasterAdminRole } from '@/lib/permissions';
import { resolvePdvInstallerDownloadUrl } from '@/lib/pdv-installer-url';
import { PdvLojaShell } from './pdv-loja-shell';

export const metadata = {
  title: 'PDV — Loja | Macofel',
  robots: { index: false, follow: false },
};

export default async function LojaPdvPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !hasPdvFullWebAccess(role)) {
    redirect('/');
  }

  const apiKey = process.env.PDV_API_KEY;
  const desktopInstallerUrl = resolvePdvInstallerDownloadUrl();
  const lojaAssetVersion =
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 12) ||
    '';
  const masterInstallerDocsHref = isMasterAdminRole(role)
    ? '/admin/master/pdv-desktop'
    : null;

  if (!apiKey) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-neutral-700">
        <p className="text-sm">
          A variável de ambiente <code className="rounded bg-neutral-100 px-1">PDV_API_KEY</code> não
          está definida no servidor.
        </p>
      </div>
    );
  }

  return (
    <PdvLojaShell
      apiKey={apiKey}
      desktopInstallerUrl={desktopInstallerUrl}
      lojaAssetVersion={lojaAssetVersion}
      masterInstallerDocsHref={masterInstallerDocsHref}
    />
  );
}
