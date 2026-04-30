import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';

function dbNameFromMongoUri(uri) {
  const name = (uri.split('?')[0].split('/').pop() || 'test').trim();
  return name || 'test';
}

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normalizeGrupoKey(raw) {
  return asString(raw)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const SKIP_NORMALIZED = new Set(['', 'SEM GRUPO', 'IMPORTADO PDF', 'TESTE GRUPO']);

function loadGrupoMacroMap() {
  const jsonPath = path.join(process.cwd(), 'render-catalog-import', 'grupo_entries.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const entries = JSON.parse(raw);
  const map = new Map();
  for (const row of entries) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const label = asString(row[0]);
    const slug = asString(row[1]);
    const k = normalizeGrupoKey(label);
    if (!k || !slug) continue;
    map.set(k, slug);
  }
  return map;
}

function macroCategorySlugForGrupo(grupo, grupoToSlug) {
  const k = normalizeGrupoKey(grupo);
  if (SKIP_NORMALIZED.has(k)) return null;
  return grupoToSlug.get(k) ?? null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const db = client.db(dbNameFromMongoUri(uri));

  const grupoToSlug = loadGrupoMacroMap();

  const productsCol = db.collection('products');
  const categoriesCol = db.collection('categories');

  const categories = await categoriesCol
    .find({}, { projection: { _id: 1, slug: 1, name: 1 } })
    .toArray();

  const categoryIdBySlug = new Map();
  for (const c of categories) {
    const slug = asString(c.slug).trim();
    if (!slug) continue;
    categoryIdBySlug.set(slug, asString(c._id));
  }

  const cursor = productsCol.find(
    {},
    { projection: { _id: 1, name: 1, slug: 1, categoryId: 1, subcategoria: 1 } }
  );

  let total = 0;
  let invalidCategoryId = 0;
  let noSuggestion = 0;
  let wouldChange = 0;
  let sameMacro = 0;

  const bySuggestion = {};
  const byCurrentCategoryId = {};
  const mismatchByPair = {};

  const sampleMismatches = [];

  for await (const p of cursor) {
    total += 1;
    const currentCatRaw = p.categoryId;
    const currentCatId =
      currentCatRaw instanceof ObjectId
        ? currentCatRaw.toString()
        : typeof currentCatRaw === 'string'
          ? currentCatRaw.trim()
          : '';

    if (currentCatId) byCurrentCategoryId[currentCatId] = (byCurrentCategoryId[currentCatId] ?? 0) + 1;

    // "inválido": string não vazia que não existe em categories
    if (currentCatId && !categories.some((c) => asString(c._id) === currentCatId)) {
      invalidCategoryId += 1;
    }

    const grupo = asString(p.subcategoria).trim();
    const suggestedSlug = macroCategorySlugForGrupo(grupo || null, grupoToSlug);
    if (!suggestedSlug) {
      noSuggestion += 1;
      continue;
    }
    bySuggestion[suggestedSlug] = (bySuggestion[suggestedSlug] ?? 0) + 1;

    const suggestedCategoryId = categoryIdBySlug.get(suggestedSlug) ?? null;
    if (!suggestedCategoryId) {
      // categoria macro inexistente no banco (seed/painel)
      continue;
    }

    if (currentCatId === suggestedCategoryId) {
      sameMacro += 1;
      continue;
    }

    wouldChange += 1;
    const pairKey = `${currentCatId || '(vazio)'} -> ${suggestedSlug}`;
    mismatchByPair[pairKey] = (mismatchByPair[pairKey] ?? 0) + 1;

    if (sampleMismatches.length < 50) {
      sampleMismatches.push({
        id: asString(p._id),
        name: asString(p.name),
        slug: asString(p.slug),
        subcategoria: grupo || null,
        currentCategoryId: currentCatId || null,
        suggestedSlug,
        suggestedCategoryId,
      });
    }
  }

  const topPairs = Object.entries(mismatchByPair)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k, n]) => ({ pair: k, n }));

  const suggestions = Object.entries(bySuggestion)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, n]) => ({ slug, n }));

  console.log(
    JSON.stringify(
      {
        db: db.databaseName,
        totals: { total, invalidCategoryId, noSuggestion, sameMacro, wouldChange },
        suggestions,
        topPairs,
        sampleMismatches,
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});

