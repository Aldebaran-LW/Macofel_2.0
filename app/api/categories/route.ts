import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getCategories, connectToDatabase } from '@/lib/mongodb-native';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getCategories();

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar categorias',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Criar categoria
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome da categoria é obrigatório' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const categoriesCollection = db.collection('categories');

    // Gerar slug a partir do nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description } = body;

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

    // Gerar slug a partir do nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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

// Deletar categoria
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
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
