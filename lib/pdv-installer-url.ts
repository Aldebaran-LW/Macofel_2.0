/**
 * URL absoluta do instalador PDV (Windows) para a página Master Admin.
 * Variáveis só no servidor — não expor em NEXT_PUBLIC_*.
 */

export function resolvePdvInstallerDownloadUrl(): string | null {
  const explicit = process.env.PDV_DESKTOP_INSTALLER_URL?.trim();
  if (explicit) return explicit;

  const rel = process.env.PDV_DESKTOP_INSTALLER_PATH?.trim();
  if (!rel) return null;

  if (rel.startsWith('http://') || rel.startsWith('https://')) return rel;
  if (!rel.startsWith('/')) return null;

  // Para downloads servidos pelo próprio Next (`public/downloads/...`), manter caminho relativo
  // evita problemas quando NEXTAUTH_URL está como localhost mas o site é acessado por IP/domínio.
  return rel;
}
