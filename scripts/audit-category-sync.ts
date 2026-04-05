import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { ROOT_CATEGORIES } from '../lib/category-hierarchy';

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    return uri.replace(/\?/, '/test?');
  }
  return uri;
}

async function main() {
  const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
  if (!uri) throw new Error('MONGODB_URI não definida');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const cats = await db
    .collection('categories')
    .find({})
    .project({ _id: 1, name: 1, slug: 1, parentId: 1, isRoot: 1 })
    .toArray();

  const roots = cats.filter((c: any) => c.parentId == null);
  const rootSlugs = new Set(ROOT_CATEGORIES.map((r) => r.slug));
  const mainRoots = roots.filter((r: any) => rootSlugs.has(String(r.slug)));

  const childrenCountEntries: Array<[string, number]> = [];
  for (const r of mainRoots as any[]) {
    const n = await db.collection('categories').countDocuments({
      $or: [{ parentId: r._id }, { parentId: String(r._id) }],
    });
    childrenCountEntries.push([String(r.slug), n]);
  }

  const prodTotal = await db.collection('products').countDocuments({});
  const prodNoCat = await db.collection('products').countDocuments({
    $or: [{ categoryId: null }, { categoryId: '' }, { categoryId: { $exists: false } }],
  });

  console.log(
    JSON.stringify(
      {
        totalCategories: cats.length,
        roots: roots.length,
        mainRoots: mainRoots.map((r: any) => ({ slug: r.slug, name: r.name, id: String(r._id) })),
        childrenCount: Object.fromEntries(childrenCountEntries),
        prodTotal,
        prodNoCat,
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

