import { z } from 'zod';
import {
  OLLAMA_BASE_URL,
  OLLAMA_MIN_DESCRIPTION_WORDS,
  OLLAMA_MODEL,
  OLLAMA_REQUEST_TIMEOUT_MS,
} from '@/env';
import {
  MACRO_CATEGORY_SLUGS,
  MACOFEL_ENRICHMENT_SYSTEM_INSTRUCTION,
  buildEnrichmentUserPrompt,
  enrichProductOutputSchema,
  type EnrichProductInput,
} from '@/lib/macofel-ai-studio-enrichment';

export type OllamaEnrichInput = Omit<EnrichProductInput, 'persist'>;

const OLLAMA_JSON_SUFFIX = `

Responde APENAS com um objeto JSON (sem markdown, sem texto extra) com EXATAMENTE estas chaves:
- "description" (string, 180–280 palavras em pt-BR)
- "imageUrls" (array de strings; [] se não houver URLs de imagem)
- "imageUrl" (string ou null)
- "weight" (número em kg ou null)
- "dimensionsCm" (string ou null, ex. "10 × 20 × 30")
- "macroCategorySlug" (string, UM destes valores literais: ${MACRO_CATEGORY_SLUGS.join(', ')})
- "confidence" (número entre 0 e 1)
- "notes" (string curta em pt-BR)`;

function pickField(
  r: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null) return r[k];
    const found = Object.keys(r).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found != null && r[found] !== undefined && r[found] !== null) {
      return r[found];
    }
  }
  return undefined;
}

function coerceMacroSlug(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if ((MACRO_CATEGORY_SLUGS as readonly string[]).includes(s)) return s;
  for (const slug of MACRO_CATEGORY_SLUGS) {
    if (s.includes(slug) || slug.includes(s)) return slug;
  }
  return 'ferramentas';
}

/** Modelos locais omitm campos — preenche o mínimo antes do Zod. */
function normalizeOllamaEnrichmentJson(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const r = raw as Record<string, unknown>;

  const imagesRaw = pickField(r, 'imageUrls', 'images', 'imagens');
  let imageUrls: string[] = [];
  if (Array.isArray(imagesRaw)) {
    imageUrls = imagesRaw.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));
  }

  let confidence = Number(pickField(r, 'confidence', 'confianca'));
  if (!Number.isFinite(confidence)) confidence = 0.55;
  confidence = Math.min(1, Math.max(0, confidence));

  const w = pickField(r, 'weight', 'peso_kg', 'peso');
  let weight: number | null = null;
  if (typeof w === 'number' && Number.isFinite(w)) weight = w;
  else if (w != null && String(w).trim()) {
    const n = parseFloat(String(w).replace(',', '.'));
    if (Number.isFinite(n)) weight = n;
  }

  const imgUrlRaw = pickField(r, 'imageUrl', 'imagem_principal');
  const imageUrl =
    typeof imgUrlRaw === 'string' && /^https?:\/\//i.test(imgUrlRaw.trim())
      ? imgUrlRaw.trim()
      : null;

  const dimRaw = pickField(r, 'dimensionsCm', 'dimensoes_cm', 'dimensoes');
  const dimensionsCm =
    dimRaw != null && String(dimRaw).trim() ? String(dimRaw).trim() : null;

  return {
    description: String(pickField(r, 'description', 'descricao', 'texto') ?? ''),
    imageUrls,
    imageUrl,
    weight,
    dimensionsCm,
    macroCategorySlug: coerceMacroSlug(pickField(r, 'macroCategorySlug', 'categoria_slug', 'categoria')),
    confidence,
    notes: String(
      pickField(r, 'notes', 'notas', 'observacoes') ??
        'Campos ausentes no JSON do modelo foram normalizados para teste local.'
    ),
  };
}

function countWordsPt(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

/**
 * Enriquecimento com LLM **local** via [Ollama](https://ollama.com) (`/api/chat`, `format: json`).
 * Requer `ollama serve` e o modelo já puxado (`ollama pull <OLLAMA_MODEL>`).
 */
export async function enrichProductWithOllama(
  input: OllamaEnrichInput
): Promise<z.infer<typeof enrichProductOutputSchema>> {
  const base = OLLAMA_BASE_URL.replace(/\/$/, '');
  const url = `${base}/api/chat`;

  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system' as const, content: MACOFEL_ENRICHMENT_SYSTEM_INSTRUCTION },
      {
        role: 'user' as const,
        content: `${buildEnrichmentUserPrompt(input)}${OLLAMA_JSON_SUFFIX}`,
      },
    ],
    format: 'json',
    stream: false,
    options: {
      temperature: 0.35,
      num_predict: 2048,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/TimeoutError|aborted due to timeout|timed out/i.test(msg)) {
      throw new Error(
        `Ollama excedeu o tempo (${OLLAMA_REQUEST_TIMEOUT_MS} ms). Aumente OLLAMA_REQUEST_TIMEOUT_MS no .env (ex.: 900000) ou use GPU / modelo mais pequeno.`
      );
    }
    if (/ECONNREFUSED|fetch failed|network/i.test(msg)) {
      throw new Error(
        `Não foi possível ligar ao Ollama em ${url}. Confirme que corre \`ollama serve\` e que OLLAMA_BASE_URL está correto. (${msg})`
      );
    }
    throw e;
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Ollama HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) {
    throw new Error(`Ollama: ${data.error}`);
  }

  const rawText = data.message?.content?.trim();
  if (!rawText) {
    throw new Error('Ollama devolveu resposta vazia (message.content).');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(
      'Ollama não devolveu JSON válido. Experimente outro modelo ou reduza o pedido.'
    );
  }

  const normalized = normalizeOllamaEnrichmentJson(raw);
  const parsed = enrichProductOutputSchema.safeParse(normalized);
  if (!parsed.success) {
    const detail = parsed.error.flatten();
    const snippet = JSON.stringify(raw).slice(0, 400);
    throw new Error(
      `JSON fora do schema após normalização: ${JSON.stringify(detail)} | resposta (início): ${snippet}`
    );
  }

  const out = parsed.data;
  const words = countWordsPt(out.description);
  if (words < OLLAMA_MIN_DESCRIPTION_WORDS) {
    throw new Error(
      `Descrição curta demais (${words} palavras; mínimo ${OLLAMA_MIN_DESCRIPTION_WORDS} via OLLAMA_MIN_DESCRIPTION_WORDS no .env). Tente modelo maior ou aumentar num_predict no Ollama.`
    );
  }

  return out;
}
