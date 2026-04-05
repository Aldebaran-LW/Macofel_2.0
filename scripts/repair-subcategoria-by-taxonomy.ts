import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { CATEGORY_TAXONOMY, mapCategoryNameToTaxonomySlug } from '../lib/category-hierarchy';

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) return uri.replace(/\?/, '/test?');
  return uri;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
  if (!uri) throw new Error('MONGODB_URI não definida');

  const taxonomyNameBySlug = new Map(CATEGORY_TAXONOMY.map((n) => [n.slug, n.name]));
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const products = db.collection('products');

  const cursor = products.find(
    {},
    { projection: { _id: 1, name: 1, description: 1, subcategoria: 1 } }
  );

  const ops: any[] = [];
  const stats: Record<string, number> = {};
  let scanned = 0;
  let updated = 0;

  const flush = async () => {
    if (dryRun || ops.length === 0) return;
    await products.bulkWrite(ops, { ordered: false });
    ops.length = 0;
  };

  for await (const p of cursor as any) {
    scanned += 1;
    const text = `${String(p.name ?? '')} | ${String(p.description ?? '')} | ${String(p.subcategoria ?? '')}`;
    const taxonomySlug = mapCategoryNameToTaxonomySlug(text);
    const nextSub = taxonomyNameBySlug.get(taxonomySlug) ?? 'Ferramentas Manuais';
    stats[nextSub] = (stats[nextSub] ?? 0) + 1;
    if (String(p.subcategoria ?? '') === nextSub) continue;

    updated += 1;
    if (!dryRun) {
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { subcategoria: nextSub, updatedAt: new Date() } },
        },
      });
      if (ops.length >= 1000) await flush();
    }
  }

  await flush();

  const top = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        updated,
        distinctSubcategoriasProjected: Object.keys(stats).length,
        topProjected: top,
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

