/* eslint-disable no-console */

const { MongoClient, ObjectId } = require('mongodb');

function dbNameFromMongoUri(uri) {
  const name = (uri.split('?')[0].split('/').pop() || 'test').trim();
  return name || 'test';
}

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbNameFromMongoUri(uri));

  const products = db.collection('products');
  const categories = db.collection('categories');

  const totalProducts = await products.countDocuments({});

  const missingCategory = await products.countDocuments({
    $or: [{ categoryId: null }, { categoryId: '' }, { categoryId: { $exists: false } }],
  });

  const invalidCategoryId = await products.countDocuments({
    categoryId: { $type: 'string' },
    $expr: { $and: [{ $ne: ['$categoryId', ''] }, { $eq: [{ $strLenCP: '$categoryId' }, 24] }] },
  });

  const topSubcategorias = await products
    .aggregate([
      {
        $addFields: {
          _subcat: {
            $trim: { input: { $ifNull: ['$subcategoria', ''] } },
          },
        },
      },
      { $match: { _subcat: { $ne: '' } } },
      { $group: { _id: '$_subcat', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 50 },
    ])
    .toArray();

  const catDocs = await categories
    .find({}, { projection: { _id: 1, name: 1, slug: 1, parentId: 1 } })
    .toArray();
  const categoryById = new Map(catDocs.map((c) => [c._id.toString(), c]));

  const byCategory = await products
    .aggregate([
      {
        $addFields: {
          _catIdStr: {
            $cond: [
              { $eq: [{ $type: '$categoryId' }, 'objectId'] },
              { $toString: '$categoryId' },
              {
                $cond: [
                  { $eq: [{ $type: '$categoryId' }, 'string'] },
                  '$categoryId',
                  '',
                ],
              },
            ],
          },
        },
      },
      { $group: { _id: '$_catIdStr', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 80 },
    ])
    .toArray();

  const byCategoryNamed = byCategory.map((row) => {
    const id = asString(row._id).trim();
    const cat = categoryById.get(id);
    return {
      categoryId: id || null,
      categoryName: cat ? cat.name : id ? '(ID não encontrado em categories)' : '(sem categoria)',
      categorySlug: cat ? cat.slug : null,
      n: row.n,
    };
  });

  console.log(
    JSON.stringify(
      {
        db: db.databaseName,
        totals: {
          totalProducts,
          missingCategory,
          invalidCategoryId,
        },
        topSubcategorias,
        byCategory: byCategoryNamed,
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

