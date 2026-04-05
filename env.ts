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

/**
 * Se definida (ex.: https://seu-servico.onrender.com/api/import), o upload em
 * `/api/admin/catalog/upload` notifica este URL em vez de só disparar o processamento local.
 */
export const RENDER_CATALOG_AGENT_URL =
  process.env.RENDER_CATALOG_AGENT_URL?.trim() ?? '';

/** Opcional: mesmo valor que RENDER_CATALOG_WEBHOOK_SECRET no Render; envia header X-Catalog-Webhook-Secret. */
export const RENDER_CATALOG_WEBHOOK_SECRET =
  process.env.RENDER_CATALOG_WEBHOOK_SECRET?.trim() ?? '';
