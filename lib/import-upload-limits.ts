/**
 * Limite de upload para importações admin (Excel/PDF/Word de catálogo).
 *
 * - VPS / `next start` local: até 100 MB (ajustável).
 * - Vercel: o corpo do pedido para Serverless fica ~4,5 MB; acima disso a plataforma
 *   devolve 413 em HTML — por isso usamos ~4 MB por defeito quando `NEXT_PUBLIC_VERCEL_ENV` ou `VERCEL=1`.
 * - Sobrescrever: `NEXT_PUBLIC_MAX_IMPORT_FILE_MB` (também lido no cliente para o input e toasts).
 */

const MB = 1024 * 1024;

export function resolveMaxImportMegabytes(): number {
  const raw = process.env.NEXT_PUBLIC_MAX_IMPORT_FILE_MB;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 100) return Math.floor(n);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_ENV) return 4;
  if (process.env.VERCEL === '1') return 4;
  return 100;
}

const _mb = resolveMaxImportMegabytes();

export const MAX_IMPORT_FILE_BYTES = Math.floor(_mb * MB);
export const MAX_IMPORT_FILE_DESC = `${_mb} MB`;

/** Deploy onde o limite do pedido é baixo (Vercel); usado para texto de ajuda na UI. */
export const IS_VERCEL_STYLE_DEPLOY = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);

export function importFileTooLarge(file: Blob): boolean {
  return file.size > MAX_IMPORT_FILE_BYTES;
}

/**
 * Evita `res.json()` quando o proxy devolve HTML (413 "Request Entity Too Large", etc.).
 */
export async function readJsonOrBodyLimitError(
  res: Response
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const raw = await res.text();
  if (ct.includes('application/json')) {
    try {
      return { ok: true, data: JSON.parse(raw) as Record<string, unknown> };
    } catch {
      return { ok: false, message: 'Resposta JSON inválida do servidor.' };
    }
  }
  if (res.status === 413) {
    return {
      ok: false,
      message: `Ficheiro ou pedido demasiado grande para este ambiente (máx. ${MAX_IMPORT_FILE_DESC}). Na Vercel o limite do pedido é cerca de 4 MB: reduza o PDF, exporte menos páginas, ou use o servidor dedicado / VPS com limite maior.`,
    };
  }
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return {
    ok: false,
    message: trimmed.slice(0, 160) || `Erro HTTP ${res.status}`,
  };
}
