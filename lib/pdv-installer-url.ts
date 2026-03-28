/**
 * URL absoluta do instalador PDV (Windows) para a página Master Admin.
 * Variáveis só no servidor — não expor em NEXT_PUBLIC_*.
 *
 * Sem URL nem PATH no .env, usa o ficheiro estável em public/downloads/.
 */

export const DEFAULT_PDV_DESKTOP_INSTALLER_PATH = '/downloads/PDV.Macofel.msi';

const ACCIDENTAL_URL_PREFIX = /^PDV_DESKTOP_INSTALLER_URL=/i;

function normalizeExplicitInstallerUrl(raw: string): string {
  let v = raw.trim();
  while (ACCIDENTAL_URL_PREFIX.test(v)) {
    v = v.replace(ACCIDENTAL_URL_PREFIX, '').trim();
  }
  return v;
}

export function resolvePdvInstallerDownloadUrl(): string | null {
  const explicitRaw = process.env.PDV_DESKTOP_INSTALLER_URL?.trim();
  const explicit = explicitRaw ? normalizeExplicitInstallerUrl(explicitRaw) : '';
  if (explicit) return explicit;

  const rel = process.env.PDV_DESKTOP_INSTALLER_PATH?.trim();
  const pathOrDefault = rel || DEFAULT_PDV_DESKTOP_INSTALLER_PATH;

  if (pathOrDefault.startsWith('http://') || pathOrDefault.startsWith('https://')) {
    return pathOrDefault;
  }
  if (!pathOrDefault.startsWith('/')) return null;

  // Para downloads servidos pelo próprio Next (`public/downloads/...`), manter caminho relativo
  // evita problemas quando NEXTAUTH_URL está como localhost mas o site é acessado por IP/domínio.
  return pathOrDefault;
}
