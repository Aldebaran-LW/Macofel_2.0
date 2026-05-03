/**
 * Lê a lista em Excel (ex.: reports/produtos-ativos-gtin-valido-todos.xls) e gera JSON
 * com peso (kg), medidas (cm) e descrição (PT-BR) via Abacus RouteLLM — sem Mongo.
 *
 * Colunas reconhecidas (nomes flexíveis, case-insensitive):
 *   codigo / código / code (opcional)
 *   name / nome / produto
 *   marca
 *   codBarra_cadastro / codBarra / ean / gtin
 *   ean_gs1_normalizado (opcional)
 *
 *   npx tsx --require dotenv/config scripts/abacus-specs-from-xls.ts --dry-run --limit 3
 *   npx tsx --require dotenv/config scripts/abacus-specs-from-xls.ts --limit 40 --batch 4
 *
 * Requer: ABACUS_API_KEY. Opcional: ABACUS_ROUTELLM_MODEL. --in caminho.xls
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { normalizeValidGtin } from '../lib/gtin-validate';

const ROUTELLM = 'https://routellm.abacus.ai/v1/chat/completions';

type SheetRow = Record<string, unknown>;

type InRow = {
  ref: string;
  codigo: string | null;
  codBarra: string;
  ean: string;
  name: string;
  marca: string;
};

type OutItem = {
  ref: string;
  codigo: string | null;
  codBarra: string;
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

function lowerKeyMap(row: SheetRow): Map<string, unknown> {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    m.set(String(k).trim().toLowerCase(), v);
  }
  return m;
}

function pick(m: Map<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = m.get(k.toLowerCase());
    if (v == null) continue;
    const s = typeof v === 'number' && Number.isFinite(v) ? String(Math.trunc(v)) : String(v).trim();
    if (s) return s;
  }
  return '';
}

function sheetRowToInRow(row: SheetRow): InRow | null {
  const m = lowerKeyMap(row);
  const codigo = pick(m, 'codigo', 'código', 'code');
  const name = pick(m, 'name', 'nome', 'produto', 'descrição curta', 'descricao');
  const marca = pick(m, 'marca');
  const barRaw = pick(
    m,
    'ean_gs1_normalizado',
    'codbarra_cadastro',
    'codbarra',
    'codigo de barras',
    'ean',
    'gtin'
  );
  const digits = digitsOnly(barRaw);
  if (!name || !digits) return null;
  const gtin = normalizeValidGtin(barRaw) || normalizeValidGtin(digits);
  const ean = gtin || digits;
  const ref = codigo || ean;
  return {
    ref,
    codigo: codigo || null,
    codBarra: barRaw || digits,
    ean,
    name,
    marca,
  };
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
  batch: InRow[]
): string {
  const compact = batch.map((b) => ({
    ref: b.ref,
    codigo: b.codigo,
    nome: b.name.slice(0, 220),
    marca: (b.marca || '').slice(0, 80),
    ean: b.ean,
  }));
  return `Entrada (array JSON — mantém a ordem; campo ref identifica cada linha: código interno ou EAN se não houver código):
${JSON.stringify(compact)}

Tarefa: para CADA item, devolve UM objeto no array de saída (mesma ordem) com:
- ref: string (igual à entrada)
- ean: string só dígitos (igual à entrada)
- weight_kg: massa em quilogramas (produto/embalagem pronta para venda), ou null se não for inferível com segurança a partir do nome/marca/EAN
- dimensions_cm: string "altura × largura × profundidade" em cm com o símbolo ×, ou null se não for inferível com segurança
- description_full: ficha comercial COMPLETA em português do Brasil (Macofel, materiais de construção, Pará). Obrigatório:
  • Entre 1.400 e 3.000 caracteres por produto (conta só o texto da descrição), salvo se o nome for tão genérico que não permita — nesse caso ainda assim mínimo 900 caracteres com aviso honesto das limitações.
  • Estrutura com linhas em branco entre blocos; cada bloco começa por um título curto em linha própria seguido de dois pontos, por exemplo: "Visão geral:", "Aplicações e público-alvo:", "Características e benefícios:", "Utilização e boas práticas:", "Armazenamento e transporte:" (omitir secções que não se apliquem, mas substituir por outro subtítulo útil).
  • Pelo menos 2 blocos com 4+ frases completas cada; linguagem profissional de distribuidor B2B/B2C (precisa, sem slogans vazios).
  • NÃO copies nem parafraseies textos de sites ou manuais de marcas; não cites normas ABNT/NBR específicas nem números de norma sem certeza absoluta.
  • Podes usar listas com traço "– " dentro dos blocos quando ajudar a leitura.

Responde APENAS com um array JSON válido (sem markdown fora do valor de description_full; dentro de description_full usa só texto e quebras de linha).`;
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
            'És editor sénior de catálogo digital para materiais de construção (Brasil). Cada description_full deve ser extensa, estruturada em secções com títulos, tom comercial e técnico equilibrado. Respostas: apenas JSON válido (array). Português do Brasil.',
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

function parseBatchResponse(raw: string, batch: InRow[]): OutItem[] {
  const arr = extractJsonArray(raw);
  if (!arr) throw new Error('Resposta Abacus: JSON array inválido');
  const byRef = new Map<string, Partial<OutItem>>();
  for (const el of arr) {
    const o = asRecord(el);
    if (!o) continue;
    const ref = String(o.ref ?? '').trim();
    const desc = String(o.description_full ?? o.description ?? '').trim();
    let weight: number | null = null;
    const wk = o.weight_kg ?? o.weight;
    if (typeof wk === 'number' && Number.isFinite(wk) && wk > 0) weight = Math.round(wk * 1000) / 1000;
    const dimsRaw = o.dimensions_cm ?? o.dimensionsCm;
    const dimensionsCm =
      typeof dimsRaw === 'string' && dimsRaw.trim() ? dimsRaw.trim().replace(/x/gi, ' × ') : null;
    const ean = digitsOnly(o.ean);
    if (ref) {
      byRef.set(ref, {
        ref,
        ean: ean || undefined,
        weight: weight ?? undefined,
        dimensionsCm: dimensionsCm ?? undefined,
        description: desc || undefined,
      });
    }
  }
  return batch.map((b) => {
    const hit = byRef.get(b.ref);
    return {
      ref: b.ref,
      codigo: b.codigo,
      codBarra: b.codBarra,
      ean: (hit?.ean && hit.ean.length ? hit.ean : b.ean) || b.ean,
      weight: hit?.weight !== undefined ? (hit.weight as number | null) : null,
      dimensionsCm: hit?.dimensionsCm !== undefined ? (hit.dimensionsCm as string | null) : null,
      description: (hit?.description as string) || '',
    };
  });
}

function readRowsFromXls(filePath: string): InRow[] {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const name = wb.SheetNames[0];
  if (!name) throw new Error('Folha vazia no Excel');
  const sheet = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '' });
  const out: InRow[] = [];
  for (const row of raw) {
    const r = sheetRowToInRow(row);
    if (r) out.push(r);
  }
  return out;
}

async function run(): Promise<void> {
  const dry = hasFlag('--dry-run');
  const strictGtin = hasFlag('--strict-gtin');
  const limit = argInt('--limit', 32);
  const batchSize = Math.min(8, Math.max(1, argInt('--batch', 4)));
  const inPath = path.resolve(
    argStr('--in', path.join(process.cwd(), 'reports', 'produtos-ativos-gtin-valido-todos.xls'))
  );
  const outPath = path.resolve(
    argStr('--out', path.join(process.cwd(), 'reports', 'produtos-specs-from-xls.json'))
  );

  if (!fs.existsSync(inPath)) {
    console.error('Ficheiro não encontrado:', inPath);
    process.exitCode = 2;
    return;
  }

  let rows = readRowsFromXls(inPath);
  if (strictGtin) {
    rows = rows.filter((r) => normalizeValidGtin(r.codBarra) != null);
  }
  rows = rows.slice(0, limit);

  if (rows.length === 0) {
    console.error('Nenhuma linha válida (precisa nome + código de barras).');
    process.exitCode = 2;
    return;
  }

  console.log(`Linhas: ${rows.length} (origem: ${inPath}) batch=${batchSize}${dry ? ' [dry-run]' : ''}`);

  const allOut: OutItem[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (dry) {
      for (const b of batch) {
        allOut.push({
          ref: b.ref,
          codigo: b.codigo,
          codBarra: b.codBarra,
          ean: b.ean,
          weight: null,
          dimensionsCm: null,
          description: '[dry-run] Retire --dry-run e defina ABACUS_API_KEY para gerar.',
        });
      }
      continue;
    }
    const raw = await callAbacus(buildUserPayload(batch));
    allOut.push(...parseBatchResponse(raw, batch));
    console.log(`  Lote ${Math.floor(i / batchSize) + 1}: ok (${batch.length})`);
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceXls: inPath,
      limit,
      batchSize,
      model:
        process.env.ABACUS_ROUTELLM_MODEL?.trim() ||
        process.env.ABACUS_CHAT_MODEL?.trim() ||
        'gpt-4o-mini',
      mongoHint:
        'Atualizar por codigo se existir; senão filtrar por codBarra (string). Campos: weight (kg), dimensionsCm, description.',
    },
    items: allOut,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Escrito:', outPath);
}

void run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
