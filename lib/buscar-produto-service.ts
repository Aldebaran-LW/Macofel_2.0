import type { BuscarProdutoResponse } from '@/lib/buscar-produto-types';

const MLB_SEARCH = 'https://api.mercadolibre.com/sites/MLB/search';
const GOOGLE_CSE = 'https://www.googleapis.com/customsearch/v1';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { expires: number; payload: BuscarProdutoResponse }>();

function hasApiAccessConfigured(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID && process.env.GEMINI_API_KEY);
}

type MlAttribute = {
  id?: string;
  value_name?: string | null;
  value_struct?: { number?: number; unit?: string | null } | null;
};

function parseMlShippingDimensions(raw: string | null | undefined): {
  dimensions_cm: string | null;
  weight_grams_hint: number | null;
} {
  if (!raw || typeof raw !== 'string') return { dimensions_cm: null, weight_grams_hint: null };
  const trimmed = raw.trim();
  const comma = trimmed.indexOf(',');
  const dimPart = comma >= 0 ? trimmed.slice(0, comma).trim() : trimmed;
  const rest = comma >= 0 ? trimmed.slice(comma + 1).trim() : '';
  const dims =
    dimPart && /\d/.test(dimPart) && dimPart.includes('x')
      ? dimPart.replace(/x/gi, ' × ')
      : null;
  const w = rest ? parseInt(rest.replace(/\D/g, ''), 10) : NaN;
  return {
    dimensions_cm: dims,
    weight_grams_hint: Number.isFinite(w) && w > 0 ? w : null,
  };
}

function parseWeightString(value: string): number | null {
  const s = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const numMatch = s.match(/([\d.,]+)\s*(kg|g|gr|gramas?|quilos?)?/i);
  if (!numMatch) return null;
  const n = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(n)) return null;
  const unit = (numMatch[2] || 'g').toLowerCase();
  if (unit.startsWith('kg') || unit.startsWith('quilo')) return Math.round(n * 1000);
  return Math.round(n);
}

function structToGrams(num: number, unit: string | null | undefined): number | null {
  if (!Number.isFinite(num)) return null;
  const u = (unit || 'g').toLowerCase();
  if (u === 'kg' || u === 'kilograms' || u === 'kilogram') return Math.round(num * 1000);
  return Math.round(num);
}

function extractWeightGrams(item: { attributes?: MlAttribute[] }): number | null {
  const ids = new Set([
    'PACKAGE_WEIGHT',
    'SELLER_PACKAGE_WEIGHT',
    'WEIGHT',
    'PRODUCT_WEIGHT',
    'ITEM_WEIGHT',
  ]);
  for (const attr of item.attributes ?? []) {
    if (!attr.id || !ids.has(attr.id)) continue;
    if (attr.value_struct?.number != null && attr.value_struct.unit) {
      const g = structToGrams(attr.value_struct.number, attr.value_struct.unit);
      if (g != null) return g;
    }
    if (attr.value_name) {
      const g = parseWeightString(attr.value_name);
      if (g != null) return g;
    }
  }
  return null;
}

function normalizeGeminiJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text.trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toResponseFromGemini(
  obj: Record<string, unknown>,
  sourceLabel: string
): BuscarProdutoResponse | null {
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title) return null;
  const photos = Array.isArray(obj.photos)
    ? (obj.photos as unknown[]).filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
    : [];
  let weight_grams: number | null = null;
  if (typeof obj.weight_grams === 'number' && Number.isFinite(obj.weight_grams)) {
    weight_grams = Math.round(obj.weight_grams);
  }
  const dimRaw = obj.dimensions_cm;
  const dimensions_cm =
    typeof dimRaw === 'string' && dimRaw.trim() ? dimRaw.trim().replace(/x/gi, ' × ') : null;
  let price_reference: number | null = null;
  if (typeof obj.price_reference === 'number' && Number.isFinite(obj.price_reference)) {
    price_reference = obj.price_reference;
  }
  return {
    title,
    photos,
    weight_grams,
    dimensions_cm,
    price_reference,
    source: sourceLabel,
    ml_url: typeof obj.ml_url === 'string' ? obj.ml_url : null,
  };
}

async function fetchMercadoLivre(query: string): Promise<BuscarProdutoResponse | null> {
  const mlRes = await fetch(
    `${MLB_SEARCH}?q=${encodeURIComponent(query)}&limit=6`,
    {
      next: { revalidate: 0 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MacofelBot/1.0 (+https://macofel.local)',
      },
    }
  );
  if (!mlRes.ok) return null;
  const mlData = (await mlRes.json()) as { results?: { id: string }[] };
  const first = mlData.results?.[0];
  if (!first?.id) return null;

  const detailRes = await fetch(`https://api.mercadolibre.com/items/${first.id}`, {
    next: { revalidate: 0 },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MacofelBot/1.0 (+https://macofel.local)',
    },
  });
  if (!detailRes.ok) return null;
  const detail = (await detailRes.json()) as {
    title?: string;
    pictures?: { secure_url?: string }[];
    price?: number;
    permalink?: string;
    shipping?: { dimensions?: string | null };
    attributes?: MlAttribute[];
  };

  const photos =
    detail.pictures?.map((p) => p.secure_url).filter((u): u is string => !!u) ?? [];
  const { dimensions_cm, weight_grams_hint } = parseMlShippingDimensions(
    detail.shipping?.dimensions ?? undefined
  );
  const weightAttr = extractWeightGrams(detail);
  const weight_grams = weightAttr ?? weight_grams_hint;

  return {
    title: detail.title || query,
    photos,
    weight_grams: weight_grams ?? null,
    dimensions_cm,
    price_reference:
      typeof detail.price === 'number' && Number.isFinite(detail.price) ? detail.price : null,
    source: 'mercadolivre',
    ml_url: detail.permalink ?? null,
  };
}

async function fetchGoogleGeminiEnrichment(
  query: string,
  mlContext: BuscarProdutoResponse | null
): Promise<BuscarProdutoResponse | null> {
  const googleKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!googleKey || !cx || !geminiKey) return null;

  const q = `${query} peso dimensões especificações`;
  const googleRes = await fetch(
    `${GOOGLE_CSE}?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&num=5`,
    { next: { revalidate: 0 } }
  );
  if (!googleRes.ok) return null;
  const googleData = await googleRes.json();

  const geminiPrompt = `És um assistente que extrai dados de produto para um catálogo de materiais de construção (Brasil).
Consulta original: "${query}".
Dados já obtidos no Mercado Livre (pode estar incompleto; confirma ou corrige só com evidência nos resultados de pesquisa):
${JSON.stringify(mlContext ?? null)}

Resultados Google Custom Search (JSON):
${JSON.stringify(googleData)}

Regras:
- Responde APENAS com um objeto JSON válido (sem markdown).
- Usa números reais; se não houver evidência, usa null para esse campo.
- photos: só URLs http(s) que pareçam imagens de produto.
- dimensions_cm: string "altura × largura × comprimento" em cm (ex.: "20 × 15 × 30").
- weight_grams: número inteiro em gramas ou null.
- price_reference: preço de referência em BRL (número) ou null.
- source deve ser exatamente: "google_gemini"

Formato:
{"title":"...","weight_grams":null,"dimensions_cm":null,"photos":[],"price_reference":null,"source":"google_gemini"}`;

  const geminiRes = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(geminiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: geminiPrompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!geminiRes.ok) return null;
  const geminiData = (await geminiRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = normalizeGeminiJson(text);
  if (!parsed) return null;
  const converted = toResponseFromGemini(parsed, 'google_gemini');
  if (!converted) return null;
  if (!converted.title?.trim()) converted.title = query;
  return converted;
}

function needsEnrichment(r: BuscarProdutoResponse | null): boolean {
  if (!r) return true;
  const noPhotos = !r.photos?.length;
  const noWeight = r.weight_grams == null;
  const noDims = !r.dimensions_cm;
  return noPhotos || noWeight || noDims;
}

function mergePreferMl(
  ml: BuscarProdutoResponse | null,
  gem: BuscarProdutoResponse | null
): BuscarProdutoResponse | null {
  if (!ml && !gem) return null;
  if (!ml) return gem;
  if (!gem) return ml;
  return {
    title: ml.title || gem.title,
    photos: ml.photos.length ? ml.photos : gem.photos,
    weight_grams: ml.weight_grams ?? gem.weight_grams,
    dimensions_cm: ml.dimensions_cm ?? gem.dimensions_cm,
    price_reference: ml.price_reference ?? gem.price_reference,
    source:
      ml.photos.length && ml.weight_grams != null && ml.dimensions_cm
        ? 'mercadolivre'
        : 'mercadolivre_google_gemini',
    ml_url: ml.ml_url ?? gem.ml_url,
  };
}

function pickBestSingle(
  query: string,
  primary: BuscarProdutoResponse | null,
  secondary: BuscarProdutoResponse | null
): BuscarProdutoResponse | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  const score = (r: BuscarProdutoResponse) =>
    (r.photos.length ? 1 : 0) +
    (r.weight_grams != null ? 1 : 0) +
    (r.dimensions_cm ? 1 : 0) +
    (r.price_reference != null ? 1 : 0);

  const best = score(primary) >= score(secondary) ? primary : secondary;
  return { ...best, title: best.title || query };
}

export async function getBuscarProdutoInfo(query: string): Promise<BuscarProdutoResponse | null> {
  const term = query.trim();
  if (!term) return null;

  const cacheKey = `produto_${term.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return hit.payload;
  }

  const shouldUseGoogleGemini = hasApiAccessConfigured();

  let mlResult: BuscarProdutoResponse | null = null;
  try {
    mlResult = await fetchMercadoLivre(term);
  } catch {
    mlResult = null;
  }

  let gemResult: BuscarProdutoResponse | null = null;
  if (shouldUseGoogleGemini) {
    try {
      gemResult = await fetchGoogleGeminiEnrichment(term, mlResult);
    } catch {
      gemResult = null;
    }
  }

  let finalResult: BuscarProdutoResponse | null = null;
  if (mlResult && gemResult) {
    finalResult = mergePreferMl(mlResult, gemResult);
  } else {
    finalResult = pickBestSingle(term, mlResult, gemResult);
  }

  if (mlResult && needsEnrichment(mlResult) && gemResult) {
    finalResult = mergePreferMl(mlResult, gemResult);
  }

  if (!finalResult) return null;
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload: finalResult });
  return finalResult;
}
