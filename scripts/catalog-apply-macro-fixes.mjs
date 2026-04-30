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
  return {
    apply: args.has('--apply'),
    limit: (() => {
      const i = argv.indexOf('--limit');
      if (i >= 0) {
        const raw = parseInt(argv[i + 1] || '0', 10);
        return Number.isFinite(raw) && raw > 0 ? raw : 0;
      }
      return 0;
    })(),
  };
}

async function main() {
  const { apply, limit } = parseArgs(process.argv);
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
  const categoryNameById = new Map();
  for (const c of categories) {
    const slug = asString(c.slug).trim();
    const id = asString(c._id);
    if (slug) categoryIdBySlug.set(slug, id);
    if (id) categoryNameById.set(id, asString(c.name));
  }

  const cursor = productsCol.find(
    {},
    { projection: { _id: 1, name: 1, slug: 1, categoryId: 1, subcategoria: 1 } }
  );

  const updates = [];
  const stats = {
    total: 0,
    noSuggestion: 0,
    missingMacroCategoryInDb: 0,
    alreadyOk: 0,
    wouldChange: 0,
  };

  for await (const p of cursor) {
    stats.total += 1;

    const grupo = asString(p.subcategoria).trim();
    const suggestedSlug = macroCategorySlugForGrupo(grupo || null, grupoToSlug);
    if (!suggestedSlug) {
      stats.noSuggestion += 1;
      continue;
    }

    const suggestedCategoryId = categoryIdBySlug.get(suggestedSlug);
    if (!suggestedCategoryId) {
      stats.missingMacroCategoryInDb += 1;
      continue;
    }

    const currentCatRaw = p.categoryId;
    const currentCatId =
      currentCatRaw instanceof ObjectId
        ? currentCatRaw.toString()
        : typeof currentCatRaw === 'string'
          ? currentCatRaw.trim()
          : '';

    if (currentCatId === suggestedCategoryId) {
      stats.alreadyOk += 1;
      continue;
    }

    stats.wouldChange += 1;
    updates.push({
      _id: p._id,
      name: asString(p.name),
      slug: asString(p.slug),
      subcategoria: grupo,
      fromCategoryId: currentCatId || null,
      fromCategoryName: currentCatId ? categoryNameById.get(currentCatId) || null : null,
      toCategoryId: suggestedCategoryId,
      toCategorySlug: suggestedSlug,
      toCategoryName: categoryNameById.get(suggestedCategoryId) || null,
    });

    if (limit > 0 && updates.length >= limit) break;
  }

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          db: db.databaseName,
          stats,
          sample: updates.slice(0, 50),
          hint: 'Para aplicar: node scripts/catalog-apply-macro-fixes.mjs --apply',
        },
        null,
        2
      )
    );
    await client.close();
    return;
  }

  const ops = updates.map((u) => ({
    updateOne: {
      filter: { _id: u._id },
      update: { $set: { categoryId: u.toCategoryId, updatedAt: new Date() } },
    },
  }));

  const result = ops.length ? await productsCol.bulkWrite(ops, { ordered: false }) : null;

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        db: db.databaseName,
        stats,
        applied: {
          matched: result?.matchedCount ?? 0,
          modified: result?.modifiedCount ?? 0,
        },
        sample: updates.slice(0, 25),
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

