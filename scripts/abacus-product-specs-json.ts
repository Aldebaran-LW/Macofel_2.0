/**
 * Gera JSON (peso kg, medidas cm, descrição completa em PT-BR) via Abacus RouteLLM,
 * para produtos ativos com EAN/GTIN válido ou com ean_web_match=ok — sem gravar no Mongo.
 *
 * Economia de tokens: lotes pequenos (uma chamada por lote), prompt curto, --limit por defeito baixo.
 *
 *   npx tsx --require dotenv/config scripts/abacus-product-specs-json.ts --dry-run --limit 5
 *   npx tsx --require dotenv/config scripts/abacus-product-specs-json.ts --pool valid-gtin --limit 40 --batch 4
 *
 * Requer: MONGODB_URI, ABACUS_API_KEY. Opcional: ABACUS_ROUTELLM_MODEL (padrão gpt-4o-mini).
 *
 * --pool pipeline-ok  → só ean_web_match === "ok" (EAN confirmado no vosso pipeline)
 * --pool valid-gtin   → ativo + checksum GS1 válido em codBarra (como o relatório CSV)
 *
 * Saída: JSON com items[].codigo, ean, weight (kg), dimensionsCm, description (revisar antes de importar).
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToDatabase, disconnectMongoNativeClient, isInactiveProductStatus } from '../lib/mongodb-native';
import { normalizeValidGtin } from '../lib/gtin-validate';

const ROUTELLM = 'https://routellm.abacus.ai/v1/chat/completions';

type Pool = 'pipeline-ok' | 'valid-gtin';

type MongoProduct = {
  _id?: unknown;
  codigo?: unknown;
  name?: unknown;
  marca?: unknown;
  subcategoria?: unknown;
  codBarra?: unknown;
  description?: unknown;
  ean_web_match?: unknown;
  status?: unknown;
};

type OutItem = {
  codigo: string;
  ean: string;
  weight: number | null;
  dimensionsCm: string | null;
  description: string;
};

function digitsOnly(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

function argStr(name: string, def: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) return def;
  return process.argv[i + 1];
}

function argInt(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) return def;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function extractJsonArray(text: string): unknown[] | null {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : t).trim();
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const arr = JSON.parse(body.slice(start, end + 1)) as unknown;
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function buildUserPayload(
  batch: Array<{
    codigo: string;
    name: string;
    marca: string;
    subcategoria: string;
    ean: string;
  }>
): string {
  const compact = batch.map((b) => ({
    codigo: b.codigo,
    nome: b.name.slice(0, 200),
    marca: (b.marca || '').slice(0, 80),
    grupo: (b.subcategoria || '').slice(0, 80),
    ean: b.ean,
  }));
  return `Entrada (array JSON — respeita a ordem e o campo codigo de cada objeto):
${JSON.stringify(compact)}

Tarefa: para CADA item, devolve UM objeto no array de saída (mesma ordem) com:
- codigo: string (igual à entrada)
- ean: string só dígitos (igual à entrada)
- weight_kg: número em quilogramas do produto embalado/venda ao consumidor, ou null se não for razoável inferir só pelo nome/grupo (não inventes valores absurdos)
- dimensions_cm: string com dimensões da embalagem ou peça em cm no formato "altura × largura × profundidade" usando o símbolo × entre números, ou null se não for inferível com segurança
- description_full: ficha comercial COMPLETA em português do Brasil (Macofel, materiais de construção). Obrigatório:
  • Entre 1.400 e 3.000 caracteres por produto (mínimo 900 se o contexto for muito pobre), com secções separadas por linha em branco; cada secção começa por título curto + dois pontos em linha própria (ex.: "Visão geral:", "Aplicações:", "Características:", "Utilização:", "Armazenamento:").
  • Pelo menos 2 secções com 4+ frases completas; tom profissional B2B/B2C; listas com "– " quando útil.
  • NÃO copies textos de sites ou marcas; não cites normas técnicas específicas sem certeza.

Responde APENAS com um array JSON válido (sem markdown fora dos valores; em description_full só texto e quebras de linha).`;
}

async function callAbacus(userContent: string): Promise<string> {
  const key = process.env.ABACUS_API_KEY?.trim();
  if (!key) throw new Error('ABACUS_API_KEY em falta');
  const model =
    process.env.ABACUS_ROUTELLM_MODEL?.trim() ||
    process.env.ABACUS_CHAT_MODEL?.trim() ||
    'gpt-4o-mini';
  const res = await fetch(ROUTELLM, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            'És editor sénior de catálogo digital (materiais de construção, Brasil). Cada description_full: extenso, secções com títulos, tom comercial-técnico. Saídas só em JSON válido. Português do Brasil.',
        },
        { role: 'user', content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Abacus HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseBatchResponse(raw: string, expectedCodigos: string[]): OutItem[] {
  const arr = extractJsonArray(raw);
  if (!arr) throw new Error('Resposta Abacus: JSON array inválido');
  const byCodigo = new Map<string, OutItem>();
  for (const el of arr) {
    const o = asRecord(el);
    if (!o) continue;
    const codigo = String(o.codigo ?? '').trim();
    const ean = digitsOnly(o.ean);
    const desc = String(o.description_full ?? o.description ?? '').trim();
    let weight: number | null = null;
    const wk = o.weight_kg ?? o.weight;
    if (typeof wk === 'number' && Number.isFinite(wk) && wk > 0) weight = Math.round(wk * 1000) / 1000;
    const dimsRaw = o.dimensions_cm ?? o.dimensionsCm;
    const dimensionsCm =
      typeof dimsRaw === 'string' && dimsRaw.trim() ? dimsRaw.trim().replace(/x/gi, ' × ') : null;
    if (codigo && desc) {
      byCodigo.set(codigo, { codigo, ean: ean || '', weight, dimensionsCm, description: desc });
    }
  }
  return expectedCodigos.map((c) => {
    const hit = byCodigo.get(c);
    if (hit) return hit;
    return { codigo: c, ean: '', weight: null, dimensionsCm: null, description: '' };
  });
}

async function run(): Promise<void> {
  const dry = hasFlag('--dry-run');
  const pool = (argStr('--pool', 'pipeline-ok') as Pool) === 'valid-gtin' ? 'valid-gtin' : 'pipeline-ok';
  const limit = argInt('--limit', 24);
  const batchSize = Math.min(8, Math.max(1, argInt('--batch', 4)));
  const outPath = path.resolve(argStr('--out', path.join(process.cwd(), 'reports', 'produtos-specs-abacus.json')));

  const db = await connectToDatabase();
  const col = db.collection('products');

  const candidates: Array<{
    codigo: string;
    name: string;
    marca: string;
    subcategoria: string;
    ean: string;
  }> = [];

  const baseFilter =
    pool === 'pipeline-ok'
      ? { codBarra: { $exists: true, $nin: [null, ''] }, ean_web_match: 'ok' }
      : { codBarra: { $exists: true, $nin: [null, ''] } };

  const cursor = col.find(baseFilter, {
    projection: {
      codigo: 1,
      name: 1,
      marca: 1,
      subcategoria: 1,
      codBarra: 1,
      ean_web_match: 1,
      status: 1,
    },
  });

  for await (const doc of cursor) {
    const p = doc as MongoProduct;
    if (isInactiveProductStatus(p.status)) continue;
    const rawBar = digitsOnly(p.codBarra);
    const gtin = normalizeValidGtin(p.codBarra);
    if (pool === 'pipeline-ok') {
      if (String(p.ean_web_match ?? '').trim() !== 'ok') continue;
    } else {
      if (!gtin) continue;
    }
    const codigo = String(p.codigo ?? '').trim();
    if (!codigo) continue;
    candidates.push({
      codigo,
      name: String(p.name ?? '').trim() || codigo,
      marca: String(p.marca ?? '').trim(),
      subcategoria: String(p.subcategoria ?? '').trim(),
      ean: gtin || rawBar,
    });
    if (candidates.length >= limit) break;
  }

  if (candidates.length === 0) {
    console.error(
      pool === 'pipeline-ok'
        ? 'Nenhum produto ativo com ean_web_match=ok. Usa --pool valid-gtin para GTIN com checksum válido (como o relatório).'
        : 'Nenhum produto ativo com GTIN válido encontrado (limite / query).'
    );
    process.exitCode = 2;
    return;
  }

  console.log(`Selecionados: ${candidates.length} (pool=${pool}, batch=${batchSize})${dry ? ' [dry-run]' : ''}`);

  const allOut: OutItem[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const expectedCodigos = batch.map((b) => b.codigo);
    if (dry) {
      for (const b of batch) {
        allOut.push({
          codigo: b.codigo,
          ean: b.ean,
          weight: null,
          dimensionsCm: null,
          description: `[dry-run] Defina ABACUS_API_KEY e retire --dry-run para gerar texto.`,
        });
      }
      continue;
    }
    const userMsg = buildUserPayload(batch);
    const raw = await callAbacus(userMsg);
    const parsed = parseBatchResponse(raw, expectedCodigos);
    allOut.push(...parsed);
    console.log(`  Lote ${Math.floor(i / batchSize) + 1}: ok (${batch.length} itens)`);
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      pool,
      limit,
      batchSize,
      model:
        process.env.ABACUS_ROUTELLM_MODEL?.trim() ||
        process.env.ABACUS_CHAT_MODEL?.trim() ||
        'gpt-4o-mini',
      note:
        'Revisar antes de importar. Campos alinhados ao Mongo: weight (kg), dimensionsCm, description. Chave de junção: codigo (+ conferir ean).',
    },
    items: allOut,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Escrito:', outPath);
}

void (async () => {
  try {
    await run();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await disconnectMongoNativeClient();
  }
})();
