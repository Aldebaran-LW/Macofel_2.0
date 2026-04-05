import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { ROOT_CATEGORIES } from '../lib/category-hierarchy';

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    return uri.replace(/\?/, '/test?');
  }
  return uri;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
  if (!uri) throw new Error('MONGODB_URI não definida');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const categoriesCollection = db.collection('categories');
  const productsCollection = db.collection('products');

  const categories = await categoriesCollection
    .find({}, { projection: { _id: 1, name: 1, slug: 1, parentId: 1 } })
    .toArray();
  const byId = new Map<string, any>(categories.map((c: any) => [String(c._id), c]));
  const rootSlugs = new Set(ROOT_CATEGORIES.map((r) => r.slug));
  const rootBySlug = new Map(categories.map((c: any) => [String(c.slug), c]));

  const resolvePath = (catIdRaw: any): { root: any | null; leaf: any | null } => {
    const catId = catIdRaw instanceof ObjectId ? String(catIdRaw) : String(catIdRaw ?? '');
    let cur = byId.get(catId) ?? null;
    const leaf = cur;
    let guard = 0;
    while (cur && cur.parentId && guard < 20) {
      const p = String(cur.parentId);
      cur = byId.get(p) ?? null;
      guard += 1;
    }
    const root = cur && rootSlugs.has(String(cur.slug)) ? cur : null;
    return { root, leaf };
  };

  const cursor = productsCollection.find(
    {},
    { projection: { _id: 1, categoryId: 1, subcategoria: 1, updatedAt: 1 } }
  );

  let scanned = 0;
  let updated = 0;
  let categoryChanged = 0;
  let subcategoriaFilled = 0;

  const ops: any[] = [];
  const flush = async () => {
    if (ops.length === 0 || dryRun) return;
    await productsCollection.bulkWrite(ops, { ordered: false });
    ops.length = 0;
  };

  for await (const p of cursor as any) {
    scanned += 1;
    const { root, leaf } = resolvePath(p.categoryId);
    if (!root) continue;

    const nextCategoryId = root._id;
    const currentSub = String(p.subcategoria ?? '').trim();
    const leafName = String(leaf?.name ?? '').trim();
    const rootName = String(root.name ?? '').trim();
    const nextSubcategoria =
      currentSub || (leafName && leafName.toLowerCase() !== rootName.toLowerCase() ? leafName : '');

    const setData: any = {};
    const unsetData: any = {};

    const sameCategory =
      String(p.categoryId instanceof ObjectId ? p.categoryId : String(p.categoryId ?? '')) ===
      String(nextCategoryId);
    if (!sameCategory) {
      setData.categoryId = nextCategoryId;
      categoryChanged += 1;
    }

    if (!currentSub && nextSubcategoria) {
      setData.subcategoria = nextSubcategoria;
      subcategoriaFilled += 1;
    } else if (!nextSubcategoria && currentSub) {
      unsetData.subcategoria = '';
    }

    if (Object.keys(setData).length === 0 && Object.keys(unsetData).length === 0) continue;

    setData.updatedAt = new Date();
    if (!dryRun) {
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: {
            ...(Object.keys(setData).length ? { $set: setData } : {}),
            ...(Object.keys(unsetData).length ? { $unset: unsetData } : {}),
          },
        },
      });
      if (ops.length >= 1000) {
        await flush();
      }
    }
    updated += 1;
  }

  await flush();

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        updated,
        categoryChanged,
        subcategoriaFilled,
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

