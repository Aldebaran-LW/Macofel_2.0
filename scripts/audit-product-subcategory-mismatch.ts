import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { macroCategorySlugForGrupo } from '../lib/grupo-macro-categoria';

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    return uri.replace(/\?/, '/test?');
  }
  return uri;
}

async function main() {
  const uri = ensureDatabaseName(process.env.MONGODB_URI || '');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const cats = await db.collection('categories').find({}, { projection: { _id: 1, slug: 1, parentId: 1 } }).toArray();
  const byId = new Map<string, any>(cats.map((c: any) => [String(c._id), c]));
  const rootSlugByCategoryId = new Map<string, string>();

  const getRoot = (catId: string): string | null => {
    if (rootSlugByCategoryId.has(catId)) return rootSlugByCategoryId.get(catId)!;
    let cur = byId.get(catId) ?? null;
    let guard = 0;
    while (cur && cur.parentId && guard < 20) {
      const p = String(cur.parentId);
      cur = byId.get(p) ?? byId.get(String(p)) ?? null;
      guard += 1;
    }
    const slug = cur?.slug ? String(cur.slug) : null;
    rootSlugByCategoryId.set(catId, slug ?? '');
    return slug;
  };

  const cursor = db
    .collection('products')
    .find({}, { projection: { _id: 1, categoryId: 1, subcategoria: 1 } })
    .limit(20000);

  let total = 0;
  let withSub = 0;
  let mismatch = 0;
  for await (const p of cursor as any) {
    total += 1;
    const sub = String(p.subcategoria ?? '').trim();
    if (!sub) continue;
    withSub += 1;
    const expectedRoot = macroCategorySlugForGrupo(sub);
    if (!expectedRoot) continue;
    const catId = p.categoryId instanceof ObjectId ? String(p.categoryId) : String(p.categoryId ?? '');
    const actualRoot = getRoot(catId);
    if (actualRoot !== expectedRoot) mismatch += 1;
  }

  console.log(JSON.stringify({ total, withSubcategoria: withSub, mismatch }, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

