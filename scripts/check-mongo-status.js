/* eslint-disable no-console */

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();

  const dbName = (uri.split('?')[0].split('/').pop() || 'test').trim() || 'test';
  const db = client.db(dbName);
  const col = db.collection('products');

  const total = await col.countDocuments({});
  const falseCount = await col.countDocuments({ status: false });
  const pendingLike = await col.countDocuments({
    status: { $in: ['pending_review', 'imported', 'rejected'] },
  });

  const topStatuses = await col
    .aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 30 },
    ])
    .toArray();

  console.log(
    JSON.stringify(
      {
        dbName,
        total,
        falseCount,
        pendingLike,
        topStatuses,
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

