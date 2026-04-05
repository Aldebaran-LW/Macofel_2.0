import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import {
  CATEGORY_TAXONOMY,
  ROOT_CATEGORIES,
  mapCategoryNameToTaxonomySlug,
  normalizeText,
  rootSlugForTaxonomySlug,
} from '../lib/category-hierarchy';

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    return uri.replace(/\?/, '/test?');
  }
  return uri;
}

const GENERIC_SUBCATEGORIES = new Set([
  'ferramentas',
  'material hidraulico',
  'material eletrico',
  'cimento e argamassa',
  'tijolos e blocos',
  'tintas e acessorios',
  '',
]);

function cleanSubcategoria(raw: string | null | undefined): string {
  return String(raw ?? '').trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
  if (!uri) throw new Error('MONGODB_URI não definida');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const products = db.collection('products');
  const categories = db.collection('categories');

  const roots = await categories
    .find({ slug: { $in: ROOT_CATEGORIES.map((r) => r.slug) } }, { projection: { _id: 1, slug: 1 } })
    .toArray();
  const rootIdBySlug = new Map<string, ObjectId>(roots.map((r: any) => [String(r.slug), r._id as ObjectId]));
  for (const r of ROOT_CATEGORIES) {
    if (!rootIdBySlug.has(r.slug)) {
      throw new Error(`Categoria raiz não encontrada: ${r.slug}`);
    }
  }

  const taxonomyBySlug = new Map(CATEGORY_TAXONOMY.map((n) => [n.slug, n]));
  const cursor = products.find(
    {},
    { projection: { _id: 1, name: 1, description: 1, subcategoria: 1, categoryId: 1 } }
  );

  const ops: any[] = [];
  const flush = async () => {
    if (dryRun || ops.length === 0) return;
    await products.bulkWrite(ops, { ordered: false });
    ops.length = 0;
  };

  const byRoot: Record<string, number> = Object.fromEntries(ROOT_CATEGORIES.map((r) => [r.slug, 0]));
  const byTaxonomy: Record<string, number> = {};
  let scanned = 0;
  let updated = 0;
  let changedCategory = 0;
  let changedSub = 0;

  for await (const p of cursor as any) {
    scanned += 1;
    const currentSub = cleanSubcategoria(p.subcategoria);
    const normalizedSub = normalizeText(currentSub);

    const textForMapping = [currentSub, String(p.name ?? ''), String(p.description ?? '')]
      .filter(Boolean)
      .join(' | ');
    const taxonomySlug = mapCategoryNameToTaxonomySlug(textForMapping);
    const rootSlug = rootSlugForTaxonomySlug(taxonomySlug);
    const rootId = rootIdBySlug.get(rootSlug)!;
    byRoot[rootSlug] = (byRoot[rootSlug] ?? 0) + 1;
    byTaxonomy[taxonomySlug] = (byTaxonomy[taxonomySlug] ?? 0) + 1;

    let nextSub = currentSub;
    if (GENERIC_SUBCATEGORIES.has(normalizedSub)) {
      nextSub = taxonomyBySlug.get(taxonomySlug)?.name ?? 'Sem grupo';
    }

    const setData: any = {};
    const currentCategoryId =
      p.categoryId instanceof ObjectId ? String(p.categoryId) : String(p.categoryId ?? '');
    if (currentCategoryId !== String(rootId)) {
      setData.categoryId = rootId;
      changedCategory += 1;
    }
    if (nextSub !== currentSub) {
      setData.subcategoria = nextSub;
      changedSub += 1;
    }
    if (Object.keys(setData).length === 0) continue;

    setData.updatedAt = new Date();
    updated += 1;
    if (!dryRun) {
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: setData },
        },
      });
      if (ops.length >= 1000) await flush();
    }
  }

  await flush();

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        updated,
        changedCategory,
        changedSubcategoria: changedSub,
        byRoot,
        topTaxonomy: Object.entries(byTaxonomy)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12),
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

