import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { getCategories, connectToDatabase } from '@/lib/mongodb-native';
import { filterCategoriesForStorefront } from '@/lib/storefront-categories';
import { ObjectId } from 'mongodb';
import {
  CATEGORY_TAXONOMY,
  ROOT_CATEGORIES,
  isTaxonomyCategorySlug,
  isRootCategorySlug,
  slugifyCategoryName,
} from '@/lib/category-hierarchy';
import {
  isCatalogApiRequestAllowed,
  catalogForbiddenResponse,
  getCatalogCorsHeaders,
} from '@/lib/api-catalog-guard';

export const dynamic = 'force-dynamic';
const TAXONOMY_BY_SLUG = new Map(CATEGORY_TAXONOMY.map((n) => [n.slug, n]));

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCatalogCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  if (!isCatalogApiRequestAllowed(req)) {
    return catalogForbiddenResponse();
  }

  const cors = getCatalogCorsHeaders(req);

  try {
    const { searchParams } = new URL(req.url);
    const categories = await getCategories();
    const payload =
      searchParams.get('storefront') === '1'
        ? filterCategoriesForStorefront(categories).filter((c: any) => c.isActive !== false)
        : categories;

    return NextResponse.json(payload, { headers: cors });
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);

    // Fallback para não quebrar a UI (sidebar/categorias no layout)
    return NextResponse.json([], { status: 200, headers: cors });
  }
}

// Criar categoria
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, slug: rawSlug, parentId, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    await ensureFixedCategoryTaxonomy(categoriesCollection);

    // Gerar slug a partir do nome
    const slug = rawSlug ? slugifyCategoryName(String(rawSlug)) : slugifyCategoryName(name);
    const normalizedParentId =
      parentId != null && String(parentId).trim() !== '' ? String(parentId).trim() : null;
    const creatingRoot = normalizedParentId == null;

    if (normalizedParentId && !ObjectId.isValid(normalizedParentId)) {
      return NextResponse.json({ error: 'parentId inválido' }, { status: 400 });
    }

    if (normalizedParentId) {
      const parent = await categoriesCollection.findOne({ _id: new ObjectId(normalizedParentId) });
      if (!parent) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
      }
    }

    if (creatingRoot && !isRootCategorySlug(slug)) {
      return NextResponse.json(
        { error: 'Novas categorias devem ser criadas como subcategorias de uma raiz fixa' },
        { status: 400 }
      );
    }

    // Verificar se já existe categoria com mesmo nome ou slug
    const existing = await categoriesCollection.findOne({
      $or: [{ name: name.trim() }, { slug }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome ou slug' },
        { status: 400 }
      );
    }

    const category = {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      parentId: normalizedParentId,
      isRoot: normalizedParentId == null && isRootCategorySlug(slug),
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await categoriesCollection.insertOne(category);

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...category,
      _count: { products: 0 },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json(
      { error: 'Erro ao criar categoria', details: error.message },
      { status: 500 }
    );
  }
}

// Atualizar categoria
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, slug: rawSlug, parentId, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    await ensureFixedCategoryTaxonomy(categoriesCollection);
    const existingCategory = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!existingCategory) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Gerar slug a partir do nome
    const slug = rawSlug ? slugifyCategoryName(String(rawSlug)) : slugifyCategoryName(name);
    const normalizedParentId =
      parentId != null && String(parentId).trim() !== '' ? String(parentId).trim() : null;
    const becomingRoot = normalizedParentId == null;

    if (normalizedParentId && !ObjectId.isValid(normalizedParentId)) {
      return NextResponse.json({ error: 'parentId inválido' }, { status: 400 });
    }

    if (normalizedParentId === id) {
      return NextResponse.json({ error: 'Categoria não pode ser pai de si mesma' }, { status: 400 });
    }

    if (normalizedParentId) {
      const parent = await categoriesCollection.findOne({ _id: new ObjectId(normalizedParentId) });
      if (!parent) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
      }
    }

    if (existingCategory.isRoot === true) {
      if (normalizedParentId) {
        return NextResponse.json(
          { error: 'Categorias raiz fixas não podem virar subcategoria' },
          { status: 400 }
        );
      }
      if (slug !== existingCategory.slug) {
        return NextResponse.json(
          { error: 'Slug das categorias raiz fixas não pode ser alterado' },
          { status: 400 }
        );
      }
    }

    const fixedNode = TAXONOMY_BY_SLUG.get(String(existingCategory.slug ?? ''));
    if (fixedNode) {
      const expectedParentSlug = fixedNode.parentSlug;
      const expectedParentId = expectedParentSlug
        ? (
            await categoriesCollection.findOne(
              { slug: expectedParentSlug },
              { projection: { _id: 1 } }
            )
          )?._id?.toString() ?? null
        : null;
      const requestedParentId = normalizedParentId ? String(normalizedParentId) : null;

      if (slug !== fixedNode.slug) {
        return NextResponse.json(
          { error: 'Slug de categoria fixa da taxonomia não pode ser alterado' },
          { status: 400 }
        );
      }

      if (requestedParentId !== expectedParentId) {
        return NextResponse.json(
          {
            error:
              'Categoria fixa da taxonomia não pode mudar de posição na árvore',
          },
          { status: 400 }
        );
      }
    }

    if (becomingRoot && !isRootCategorySlug(slug)) {
      return NextResponse.json(
        { error: 'Apenas as 6 categorias principais podem permanecer na raiz' },
        { status: 400 }
      );
    }

    if (normalizedParentId) {
      let cursor = normalizedParentId;
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json(
            { error: 'Movimento inválido: criaria ciclo na árvore de categorias' },
            { status: 400 }
          );
        }
        const ancestor = await categoriesCollection.findOne({ _id: new ObjectId(cursor) });
        cursor = ancestor?.parentId ? String(ancestor.parentId) : '';
      }
    }

    // Verificar se já existe outra categoria com mesmo nome ou slug
    const existing = await categoriesCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      $or: [{ name: name.trim() }, { slug }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe outra categoria com este nome ou slug' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      parentId: normalizedParentId,
      isRoot: normalizedParentId == null && isRootCategorySlug(slug),
      isActive: isActive !== false,
      updatedAt: new Date(),
    };

    const result = await categoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    // Buscar categoria atualizada
    const updatedCategory = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    
    if (!updatedCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada após atualização' },
        { status: 404 }
      );
    }

    const productsCollection = db.collection('products');
    const productCount = await productsCollection.countDocuments({
      categoryId: new ObjectId(id),
    });

    return NextResponse.json({
      id: updatedCategory._id.toString(),
      name: updatedCategory.name,
      slug: updatedCategory.slug,
      description: updatedCategory.description,
      parentId: updatedCategory.parentId ? String(updatedCategory.parentId) : null,
      isRoot: updatedCategory.isRoot === true || isRootCategorySlug(updatedCategory.slug),
      isActive: updatedCategory.isActive !== false,
      _count: { products: productCount },
      createdAt: updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar categoria:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria', details: error.message },
      { status: 500 }
    );
  }
}

async function ensureFixedCategoryTaxonomy(categoriesCollection: any) {
  const now = new Date();
  const idBySlug = new Map<string, string>();

  for (const node of CATEGORY_TAXONOMY) {
    const existing = await categoriesCollection.findOne({
      $or: [{ slug: node.slug }, { name: node.name }],
    });
    if (existing) {
      idBySlug.set(node.slug, existing._id.toString());
      if (existing.slug !== node.slug || existing.name !== node.name) {
        await categoriesCollection.updateOne(
          { _id: existing._id },
          {
            $set: {
              slug: node.slug,
              name: node.name,
              updatedAt: now,
            },
          }
        );
      }
      continue;
    }
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

  for (const node of CATEGORY_TAXONOMY) {
    const currentId = idBySlug.get(node.slug);
    if (!currentId) continue;
    const parentId = node.parentSlug ? idBySlug.get(node.parentSlug) ?? null : null;
    const currentDoc = await categoriesCollection.findOne(
      { _id: new ObjectId(currentId) },
      { projection: { isActive: 1 } }
    );
    await categoriesCollection.updateOne(
      { _id: new ObjectId(currentId) },
      {
        $set: {
          name: node.name,
          description: node.description ?? null,
          parentId,
          isRoot: node.parentSlug == null,
          isActive: currentDoc?.isActive !== false,
          sortOrder: node.sortOrder,
          updatedAt: now,
        },
      }
    );
  }
}

// Deletar categoria
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canAccessAdminCatalogSession((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');
    const productsCollection = db.collection('products');
    const category = await categoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    if (category.isRoot === true || isTaxonomyCategorySlug(String(category.slug ?? ''))) {
      return NextResponse.json(
        { error: 'Categorias fixas da taxonomia não podem ser excluídas' },
        { status: 400 }
      );
    }

    const childrenCount = await categoriesCollection.countDocuments({ parentId: id });
    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar. Existem ${childrenCount} subcategoria(s) vinculada(s).` },
        { status: 400 }
      );
    }

    // Verificar se há produtos nesta categoria
    const productCount = await productsCollection.countDocuments({
      categoryId: new ObjectId(id),
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar a categoria. Existem ${productCount} produto(s) associado(s).` },
        { status: 400 }
      );
    }

    const result = await categoriesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar categoria:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar categoria', details: error.message },
      { status: 500 }
    );
  }
}
