import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import {
  CATEGORY_TAXONOMY,
  ROOT_CATEGORIES,
  mapCategoryNameToTaxonomySlug,
  rootSlugForTaxonomySlug,
} from '../lib/category-hierarchy';

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
  const now = new Date();

  const idBySlug = new Map<string, string>();

  for (const node of CATEGORY_TAXONOMY) {
    const existing = await categoriesCollection.findOne({
      $or: [{ slug: node.slug }, { name: node.name }],
    });
    if (existing) {
      idBySlug.set(node.slug, existing._id.toString());
      if (!dryRun) {
        await categoriesCollection.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: node.name,
              slug: node.slug,
              description: node.description ?? null,
              isRoot: node.parentSlug == null,
              isActive: existing.isActive !== false,
              sortOrder: node.sortOrder,
              updatedAt: now,
            },
          }
        );
      }
    } else if (!dryRun) {
      const inserted = await categoriesCollection.insertOne({
        name: node.name,
        slug: node.slug,
        description: node.description ?? null,
        parentId: null,
        isRoot: node.parentSlug == null,
        isActive: true,
        sortOrder: node.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
      idBySlug.set(node.slug, inserted.insertedId.toString());
    }
  }

  if (dryRun) {
    for (const node of CATEGORY_TAXONOMY) {
      if (!idBySlug.get(node.slug)) {
        const bySlug = await categoriesCollection.findOne({ slug: node.slug });
        if (bySlug) idBySlug.set(node.slug, bySlug._id.toString());
      }
    }
  }

  for (const node of CATEGORY_TAXONOMY) {
    const currentId = idBySlug.get(node.slug);
    if (!currentId || dryRun) continue;
    const parentId = node.parentSlug ? idBySlug.get(node.parentSlug) ?? null : null;
    await categoriesCollection.updateOne(
      { _id: new ObjectId(currentId) },
      {
        $set: {
          parentId,
          isRoot: node.parentSlug == null,
          sortOrder: node.sortOrder,
          updatedAt: now,
        },
      }
    );
  }

  const allCategories = await categoriesCollection.find({}).toArray();
  const fixedIdSet = new Set([...idBySlug.values()]);
  let moved = 0;
  for (const cat of allCategories) {
    const catId = cat._id.toString();
    if (fixedIdSet.has(catId)) continue;
    const mappedTaxonomySlug = mapCategoryNameToTaxonomySlug(String(cat.name ?? ''));
    const parentId = idBySlug.get(mappedTaxonomySlug);
    if (!parentId) continue;
    const already = String(cat.parentId ?? '') === parentId && cat.isRoot !== true;
    if (already) continue;
    moved += 1;
    if (!dryRun) {
      await categoriesCollection.updateOne(
        { _id: cat._id },
        {
          $set: {
            parentId,
            isRoot: false,
            isActive: cat.isActive !== false,
            updatedAt: now,
          },
        }
      );
    }
  }

  const roots = await categoriesCollection
    .find({
      $or: [
        { isRoot: true },
        { slug: { $in: ROOT_CATEGORIES.map((r) => r.slug) } },
        { parentId: null },
      ],
    })
    .toArray();
  const rootsBySlug = new Map(roots.map((r) => [String(r.slug), r]));

  const sample: Record<string, string[]> = {};
  for (const root of ROOT_CATEGORIES) {
    const rootDoc = rootsBySlug.get(root.slug);
    if (!rootDoc) continue;
    const children = await categoriesCollection
      .find({ $or: [{ parentId: rootDoc._id.toString() }, { parentId: rootDoc._id }] })
      .sort({ name: 1 })
      .limit(10)
      .toArray();
    sample[root.name] = children.map((c) => String(c.name));
  }

  const countsByRoot: Record<string, number> = Object.fromEntries(ROOT_CATEGORIES.map((r) => [r.slug, 0]));
  for (const cat of allCategories) {
    const slug = String(cat.slug ?? '');
    if (countsByRoot[slug] != null && (cat.isRoot === true || cat.parentId == null)) continue;
    const taxonomySlug = mapCategoryNameToTaxonomySlug(String(cat.name ?? ''));
    const rootSlug = rootSlugForTaxonomySlug(taxonomySlug);
    countsByRoot[rootSlug] = (countsByRoot[rootSlug] ?? 0) + 1;
  }

  if (!dryRun) {
    // Corrige produtos em categorias de mesmo nome das raízes antigas.
    const rootsByName = new Map(ROOT_CATEGORIES.map((r) => [r.name.toLowerCase(), r.slug]));
    for (const cat of allCategories) {
      const targetRootSlug = rootsByName.get(String(cat.name ?? '').toLowerCase());
      if (!targetRootSlug) continue;
      const targetRootId = idBySlug.get(targetRootSlug);
      if (!targetRootId || targetRootId === cat._id.toString()) continue;
      await productsCollection.updateMany(
        { $or: [{ categoryId: cat._id }, { categoryId: cat._id.toString() }] },
        { $set: { categoryId: new ObjectId(targetRootId), updatedAt: now } }
      );
      await categoriesCollection.deleteOne({ _id: cat._id });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        ensuredRoots: ROOT_CATEGORIES.map((r) => r.name),
        subcategoriesMoved: moved,
        countsByRoot,
        sampleChildrenByRoot: sample,
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
