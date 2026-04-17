/** Variáveis de ambiente tipadas para uso no servidor (evita espalhar process.env). */

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

/**
 * Modelo só para enriquecimento AI Studio (`/api/v1/enrich-product`, `test:ai-studio-enrich`).
 * Se vazio, usa `CATALOG_AGENT_GEMINI_MODEL` ou `gemini-2.0-flash`. Útil quando o free tier
 * do 2.0-flash está em 429 — experimente ex.: `gemini-2.5-flash` ou `gemini-2.5-flash-lite`.
 */
export const GEMINI_ENRICH_MODEL = process.env.GEMINI_ENRICH_MODEL?.trim() ?? '';

/** Bright Data (Web Scraper / MCP); opcional até integração no backend. */
export const BRIGHTDATA_API_TOKEN = process.env.BRIGHTDATA_API_TOKEN?.trim() ?? '';

export const CATALOG_AGENT_GEMINI_MODEL =
  process.env.CATALOG_AGENT_GEMINI_MODEL?.trim() || '';

/** Limite de produtos por importação (evita timeout). Padrão 50; teto 500. */
const parsedBatch = parseInt(process.env.MAX_CATALOG_BATCH ?? '', 10);
export const MAX_CATALOG_BATCH = Number.isFinite(parsedBatch) && parsedBatch > 0
  ? Math.min(500, parsedBatch)
  : 50;

/** Segredo para `/api/admin/catalog/process` (header `x-catalog-secret`). */
export const CATALOG_INTERNAL_SECRET = process.env.CATALOG_INTERNAL_SECRET ?? '';

/**
 * Chave para `POST /api/v1/enrich-product` (header `x-api-key`).
 * Gere um valor aleatório longo; opcional até configurar integração (AI Studio / automações).
 */
export const MACOFEL_ENRICH_API_KEY = process.env.MACOFEL_ENRICH_API_KEY?.trim() ?? '';

/** `gemini` (Google) ou `ollama` (LLM local). */
export type MacofelEnrichBackend = 'gemini' | 'ollama';
export const MACOFEL_ENRICH_BACKEND: MacofelEnrichBackend =
  process.env.MACOFEL_ENRICH_BACKEND?.trim().toLowerCase() === 'ollama'
    ? 'ollama'
    : 'gemini';

/** Opcional: Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` ao chamar rotas agendadas. */
export const CRON_SECRET = process.env.CRON_SECRET?.trim() ?? '';

/**
 * Se definida (ex.: https://seu-servico.onrender.com/api/import), o upload em
 * `/api/admin/catalog/upload` notifica este URL em vez de só disparar o processamento local.
 */
export const RENDER_CATALOG_AGENT_URL =
  process.env.RENDER_CATALOG_AGENT_URL?.trim() ?? '';

/** Opcional: mesmo valor que RENDER_CATALOG_WEBHOOK_SECRET no Render; envia header X-Catalog-Webhook-Secret. */
export const RENDER_CATALOG_WEBHOOK_SECRET =
  process.env.RENDER_CATALOG_WEBHOOK_SECRET?.trim() ?? '';

/**
 * Caminho completo do `soffice.com` / `soffice.exe` (LibreOffice).
 * Usado na importação de relatórios `.xls` quando o SheetJS falha (ex.: LABELSST truncado).
 * Na Vercel não há LibreOffice — use `.xlsx` ou um servidor com Node + LibreOffice.
 */
export const MACOFEL_SOFFICE = process.env.MACOFEL_SOFFICE?.trim() ?? '';

/**
 * Pasta raiz da instalação LibreOffice (com subpasta `program`), alternativa a `MACOFEL_SOFFICE`.
 */
export const MACOFEL_LIBREOFFICE_HOME =
  process.env.MACOFEL_LIBREOFFICE_HOME?.trim() ?? '';

/** Base URL do Ollama (ex.: http://127.0.0.1:11434). */
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';

/** Modelo Ollama para testes de enriquecimento local (`ollama pull <nome>`). */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || 'llama3.2';

/** Timeout HTTP para `/api/chat` (ms). CPU lento pode precisar 10–15 min. */
const ollamaTimeout = parseInt(process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? '', 10);
export const OLLAMA_REQUEST_TIMEOUT_MS = Number.isFinite(ollamaTimeout) && ollamaTimeout >= 60_000
  ? Math.min(900_000, ollamaTimeout)
  : 600_000;

/** Mínimo de palavras na descrição quando o backend é Ollama (modelos pequenos raramente chegam a 180). */
const ollamaMinWords = parseInt(process.env.OLLAMA_MIN_DESCRIPTION_WORDS ?? '', 10);
export const OLLAMA_MIN_DESCRIPTION_WORDS = Number.isFinite(ollamaMinWords) && ollamaMinWords >= 30
  ? Math.min(180, ollamaMinWords)
  : 40;
