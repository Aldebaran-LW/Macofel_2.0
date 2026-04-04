/** Variáveis de ambiente tipadas para uso no servidor (evita espalhar process.env). */

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

export const CATALOG_AGENT_GEMINI_MODEL =
  process.env.CATALOG_AGENT_GEMINI_MODEL?.trim() || '';

/** Limite de produtos por importação (evita timeout). Padrão 50. */
const parsedBatch = parseInt(process.env.MAX_CATALOG_BATCH ?? '', 10);
export const MAX_CATALOG_BATCH = Number.isFinite(parsedBatch) && parsedBatch > 0
  ? Math.min(100, parsedBatch)
  : 50;

/** Segredo para `/api/admin/catalog/process` (header `x-catalog-secret`). */
export const CATALOG_INTERNAL_SECRET = process.env.CATALOG_INTERNAL_SECRET ?? '';
