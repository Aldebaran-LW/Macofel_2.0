/**
 * Aplica `reports/produtos-specs-from-xls.json` (ou outro JSON com a mesma forma) no Mongo.
 * Não chama Abacus. Só grava campos que ainda estão vazios no documento.
 *
 * Regras por campo (não sobrescrever se já preenchido):
 * - weight: só se não existir número finito > 0
 * - dimensionsCm: só se string vazia / só espaços
 * - description: só se texto existente tiver menos de 400 caracteres (após trim) — considera-se "incompleta"
 *
 *   npx tsx --require dotenv/config scripts/apply-product-specs-from-json.ts --dry-run
 *   npx tsx --require dotenv/config scripts/apply-product-specs-from-json.ts --apply
 *
 * --in caminho.json   (padrão: reports/produtos-specs-from-xls.json)
 * --min-desc-chars N  (padrão 400: acima disto não atualiza descrição)
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToDatabase, disconnectMongoNativeClient, isInactiveProductStatus } from '../lib/mongodb-native';

type JsonItem = {
  ref?: unknown;
  codigo?: unknown;
  codBarra?: unknown;
  ean?: unknown;
  weight?: unknown;
  dimensionsCm?: unknown;
  description?: unknown;
};

type JsonFile = {
  items?: JsonItem[];
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

function buildFilter(item: JsonItem): Record<string, unknown> | null {
  const codigo = String(item.codigo ?? '').trim();
  if (codigo) {
    const or: Record<string, unknown>[] = [{ codigo }];
    const num = Number(codigo);
    if (Number.isFinite(num) && String(num) === codigo) or.push({ codigo: num });
    return { $or: or };
  }
  const bar = digitsOnly(item.codBarra ?? item.ean ?? item.ref ?? '');
  if (!bar) return null;
  const or: Record<string, unknown>[] = [{ codBarra: bar }];
  const num = Number(bar);
  if (Number.isFinite(num) && String(num) === bar) or.push({ codBarra: num });
  return { $or: or };
}

function docHasWeight(doc: { weight?: unknown }): boolean {
  const w = doc.weight;
  return typeof w === 'number' && Number.isFinite(w) && w > 0;
}

function docHasDimensions(doc: { dimensionsCm?: unknown }): boolean {
  const d = doc.dimensionsCm;
  return typeof d === 'string' && d.trim().length > 0;
}

function docHasCompleteDescription(doc: { description?: unknown }, minChars: number): boolean {
  const t = String(doc.description ?? '').trim();
  return t.length >= minChars;
}

function jsonWeightKg(item: JsonItem): number | null {
  const w = item.weight;
  if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) return null;
  return Math.round(w * 1000) / 1000;
}

function jsonDimensions(item: JsonItem): string | null {
  const d = item.dimensionsCm;
  if (typeof d !== 'string' || !d.trim()) return null;
  return d.trim().replace(/x/gi, ' × ');
}

function jsonDescription(item: JsonItem): string | null {
  const d = item.description;
  if (typeof d !== 'string' || !d.trim()) return null;
  return d.trim();
}

async function run(): Promise<void> {
  const dry = !hasFlag('--apply');
  const inPath = path.resolve(
    argStr('--in', path.join(process.cwd(), 'reports', 'produtos-specs-from-xls.json'))
  );
  const minDescChars = argInt('--min-desc-chars', 400);

  if (!fs.existsSync(inPath)) {
    console.error('Ficheiro não encontrado:', inPath);
    process.exitCode = 2;
    return;
  }

  const raw = JSON.parse(fs.readFileSync(inPath, 'utf8')) as JsonFile;
  const items = Array.isArray(raw.items) ? raw.items : [];
  if (items.length === 0) {
    console.error('JSON sem items[]');
    process.exitCode = 2;
    return;
  }

  const db = await connectToDatabase();
  const col = db.collection('products');

  let notFound = 0;
  let inactive = 0;
  let nothingToSet = 0;
  let wouldUpdate = 0;
  let updated = 0;

  for (const item of items) {
    const filter = buildFilter(item);
    if (!filter) {
      notFound++;
      continue;
    }
    const doc = await col.findOne(filter, { projection: { weight: 1, dimensionsCm: 1, description: 1, status: 1 } });
    if (!doc) {
      notFound++;
      continue;
    }
    if (isInactiveProductStatus(doc.status)) {
      inactive++;
      continue;
    }

    const set: Record<string, unknown> = {};
    const jw = jsonWeightKg(item);
    const jd = jsonDimensions(item);
    const jdesc = jsonDescription(item);

    if (jw != null && !docHasWeight(doc)) set.weight = jw;
    if (jd != null && !docHasDimensions(doc)) set.dimensionsCm = jd;
    if (jdesc != null && !docHasCompleteDescription(doc, minDescChars)) set.description = jdesc;

    if (Object.keys(set).length === 0) {
      nothingToSet++;
      continue;
    }

    set.updatedAt = new Date();

    if (dry) {
      wouldUpdate++;
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: set });
    updated++;
  }

  console.log(
    JSON.stringify(
      {
        mode: dry ? 'dry-run (use --apply para gravar)' : 'apply',
        source: inPath,
        minDescCharsToPreserve: minDescChars,
        totalItems: items.length,
        notFound,
        skippedInactive: inactive,
        skippedNothingToSet: nothingToSet,
        ...(dry ? { wouldUpdate } : { updated }),
      },
      null,
      2
    )
  );
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
