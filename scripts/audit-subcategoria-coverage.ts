import 'dotenv/config';
import { MongoClient } from 'mongodb';

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

  const [total, withSub, distinctSub] = await Promise.all([
    db.collection('products').countDocuments({}),
    db.collection('products').countDocuments({ subcategoria: { $type: 'string', $nin: ['', null] } }),
    db.collection('products').distinct('subcategoria', { subcategoria: { $type: 'string', $nin: ['', null] } }),
  ]);

  const roots = await db
    .collection('categories')
    .find({ isRoot: true }, { projection: { _id: 1, name: 1, slug: 1 } })
    .toArray();

  const byRoot: Array<{ root: string; withSub: number }> = [];
  for (const r of roots as any[]) {
    const children = await db
      .collection('categories')
      .find({ $or: [{ parentId: r._id }, { parentId: String(r._id) }] }, { projection: { _id: 1 } })
      .toArray();
    const ids: any[] = [r._id, String(r._id), ...children.map((c: any) => c._id), ...children.map((c: any) => String(c._id))];
    const count = await db.collection('products').countDocuments({
      categoryId: { $in: ids },
      subcategoria: { $type: 'string', $nin: ['', null] },
    });
    byRoot.push({ root: String(r.name), withSub: count });
  }

  console.log(
    JSON.stringify(
      {
        totalProducts: total,
        productsWithSubcategoria: withSub,
        subcategoriaCoveragePct: total > 0 ? Number(((withSub / total) * 100).toFixed(2)) : 0,
        distinctSubcategorias: distinctSub.length,
        byRoot,
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

