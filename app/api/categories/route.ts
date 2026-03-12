import { NextRequest, NextResponse } from 'next/server';
import { getCategories, createCategory } from '@/lib/mongodb-native';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    const categoryId = await createCategory({
      name,
      slug,
      description,
    });

    return NextResponse.json(
      { 
        message: 'Categoria criada com sucesso',
        id: categoryId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar categoria:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao criar categoria',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
