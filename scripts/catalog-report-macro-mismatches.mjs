import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

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

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const get = (name, fallback) => {
    const i = argv.indexOf(name);
    if (i < 0) return fallback;
    const v = argv[i + 1];
    return v == null ? fallback : v;
  };
  return {
    onlyFromSlug: get('--only-from-slug', ''),
    sample: Math.max(0, parseInt(get('--sample', '30'), 10) || 0),
    progressEvery: Math.max(0, parseInt(get('--progress-every', '5000'), 10) || 0),
    limitDocs: Math.max(0, parseInt(get('--limit-docs', '0'), 10) || 0),
    includeNoSuggestion: args.has('--include-no-suggestion'),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const {
    onlyFromSlug,
    sample,
    progressEvery,
    limitDocs,
    includeNoSuggestion,
  } = parseArgs(process.argv);

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
  const categorySlugById = new Map();
  const categoryNameById = new Map();
  for (const c of categories) {
    const id = asString(c._id);
    const slug = asString(c.slug).trim();
    const name = asString(c.name).trim();
    if (slug) categoryIdBySlug.set(slug, id);
    if (id) categorySlugById.set(id, slug || null);
    if (id) categoryNameById.set(id, name || null);
  }

  const onlyFromCategoryId =
    onlyFromSlug && categoryIdBySlug.get(onlyFromSlug) ? categoryIdBySlug.get(onlyFromSlug) : '';

  const query = onlyFromCategoryId ? { categoryId: onlyFromCategoryId } : {};

  const cursor = productsCol.find(query, {
    projection: { _id: 1, name: 1, slug: 1, categoryId: 1, subcategoria: 1 },
    batchSize: 1000,
  });

  const totals = {
    scanned: 0,
    noSuggestion: 0,
    suggestionButMacroMissingInDb: 0,
    alreadyOk: 0,
    wouldChange: 0,
  };

  const byToSlug = new Map();
  const byPair = new Map(); // fromSlug -> toSlug
  const samples = [];

  for await (const p of cursor) {
    totals.scanned += 1;
    if (limitDocs > 0 && totals.scanned > limitDocs) break;

    if (progressEvery > 0 && totals.scanned % progressEvery === 0) {
      console.error(`[progress] scanned=${totals.scanned} wouldChange=${totals.wouldChange}`);
    }

    const currentCatRaw = p.categoryId;
    const currentCatId =
      currentCatRaw instanceof ObjectId
        ? currentCatRaw.toString()
        : typeof currentCatRaw === 'string'
          ? currentCatRaw.trim()
          : '';

    const currentSlug = currentCatId ? categorySlugById.get(currentCatId) || '(unknown)' : '(none)';

    const grupo = asString(p.subcategoria).trim();
    const suggestedSlug = macroCategorySlugForGrupo(grupo || null, grupoToSlug);
    if (!suggestedSlug) {
      totals.noSuggestion += 1;
      if (includeNoSuggestion && samples.length < sample) {
        samples.push({
          id: asString(p._id),
          name: asString(p.name),
          slug: asString(p.slug),
          subcategoria: grupo || null,
          fromCategorySlug: currentSlug,
          toCategorySlug: null,
          reason: 'no_suggestion',
        });
      }
      continue;
    }

    const suggestedCategoryId = categoryIdBySlug.get(suggestedSlug);
    if (!suggestedCategoryId) {
      totals.suggestionButMacroMissingInDb += 1;
      continue;
    }

    if (currentCatId === suggestedCategoryId) {
      totals.alreadyOk += 1;
      continue;
    }

    totals.wouldChange += 1;
    byToSlug.set(suggestedSlug, (byToSlug.get(suggestedSlug) ?? 0) + 1);
    const pairKey = `${currentSlug} -> ${suggestedSlug}`;
    byPair.set(pairKey, (byPair.get(pairKey) ?? 0) + 1);

    if (samples.length < sample) {
      samples.push({
        id: asString(p._id),
        name: asString(p.name),
        slug: asString(p.slug),
        subcategoria: grupo || null,
        fromCategoryId: currentCatId || null,
        fromCategorySlug: currentSlug,
        fromCategoryName: currentCatId ? categoryNameById.get(currentCatId) || null : null,
        toCategoryId: suggestedCategoryId,
        toCategorySlug: suggestedSlug,
        toCategoryName: categoryNameById.get(suggestedCategoryId) || null,
      });
    }
  }

  const topPairs = Array.from(byPair.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([pair, n]) => ({ pair, n }));

  const topTo = Array.from(byToSlug.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([slug, n]) => ({ slug, n }));

  console.log(
    JSON.stringify(
      {
        db: db.databaseName,
        filter: { onlyFromSlug: onlyFromSlug || null },
        totals,
        topTo,
        topPairs,
        samples,
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

