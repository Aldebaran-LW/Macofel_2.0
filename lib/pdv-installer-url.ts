/**
 * URL absoluta do instalador PDV (Windows) para a página Master Admin.
 * Variáveis só no servidor — não expor em NEXT_PUBLIC_*.
 */

export function resolvePdvInstallerDownloadUrl(): string | null {
  const explicit = process.env.PDV_DESKTOP_INSTALLER_URL?.trim();
  if (explicit) return explicit;

  const rel = process.env.PDV_DESKTOP_INSTALLER_PATH?.trim();
  if (!rel || !rel.startsWith('/')) return null;

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!base) return null;
  return `${base}${rel}`;
}
