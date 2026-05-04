import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';
import {
  CATEGORY_TAXONOMY,
  ROOT_CATEGORIES,
  mapCategoryNameToTaxonomySlug,
  rootSlugForTaxonomySlug,
} from '@/lib/category-hierarchy';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    const taxonomySlugSet = new Set(CATEGORY_TAXONOMY.map((r) => r.slug));
    const categories = await categoriesCollection.find({}).toArray();

    const countsByRootSlug: Record<string, number> = Object.fromEntries(
      ROOT_CATEGORIES.map((r) => [r.slug, 0])
    );
    let totalToMove = 0;

    for (const cat of categories) {
      if (taxonomySlugSet.has(String(cat.slug ?? ''))) continue;
      const taxonomySlug = mapCategoryNameToTaxonomySlug(String(cat.name ?? ''));
      const rootSlug = rootSlugForTaxonomySlug(taxonomySlug);
      countsByRootSlug[rootSlug] = (countsByRootSlug[rootSlug] ?? 0) + 1;
      totalToMove += 1;
    }

    return NextResponse.json({
      roots: ROOT_CATEGORIES.map((r) => ({
        name: r.name,
        slug: r.slug,
        willReceive: countsByRootSlug[r.slug] ?? 0,
      })),
      totalToMove,
    });
  } catch (error: any) {
    console.error('[admin/categories/normalize-hierarchy GET]', error);
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    const now = new Date();

    const idBySlug = new Map<string, string>();

    for (const node of CATEGORY_TAXONOMY) {
      const existing = await categoriesCollection.findOne({
        $or: [{ slug: node.slug }, { name: node.name }],
      });
      if (existing) {
        await categoriesCollection.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: node.name,
              slug: node.slug,
              description: node.description ?? null,
              parentId: null,
              isRoot: node.parentSlug == null,
              isActive: existing.isActive !== false,
              sortOrder: node.sortOrder,
              updatedAt: now,
            },
          }
        );
        idBySlug.set(node.slug, existing._id.toString());
      } else {
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

    for (const node of CATEGORY_TAXONOMY) {
      const currentId = idBySlug.get(node.slug);
      if (!currentId) continue;
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

      const mappedTaxonomySlug = mapCategoryNameToTaxonomySlug(cat.name ?? '');
      const parentId = idBySlug.get(mappedTaxonomySlug);
      if (!parentId) continue;

      const already = String(cat.parentId ?? '') === parentId && cat.isRoot !== true;
      if (already) continue;

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
      moved += 1;
    }

    const rootsByNameNormalized = new Map(ROOT_CATEGORIES.map((r) => [r.name.toLowerCase(), r.slug]));
    for (const cat of allCategories) {
      const slug = rootsByNameNormalized.get(String(cat.name ?? '').toLowerCase());
      if (!slug) continue;
      const rootId = idBySlug.get(slug);
      if (!rootId) continue;
      if (cat._id.toString() === rootId) continue;

      const productsCollection = db.collection('products');
      await productsCollection.updateMany(
        { categoryId: cat._id },
        { $set: { categoryId: new ObjectId(rootId), updatedAt: now } }
      );
      await productsCollection.updateMany(
        { categoryId: cat._id.toString() },
        { $set: { categoryId: new ObjectId(rootId), updatedAt: now } }
      );
      await categoriesCollection.deleteOne({ _id: cat._id });
    }

    return NextResponse.json({
      ok: true,
      roots: ROOT_CATEGORIES.length,
      subcategoriesMoved: moved,
    });
  } catch (error: any) {
    console.error('[admin/categories/normalize-hierarchy]', error);
    return NextResponse.json(
      { error: 'Erro ao normalizar hierarquia de categorias' },
      { status: 500 }
    );
  }
}
