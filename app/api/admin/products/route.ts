import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// Criar novo produto
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, stock, minStock, weight, imageUrl, categoryId, featured } = body;

    if (!name || !description || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, description, price, categoryId' },
        { status: 400 }
      );
    }

    // Gerar slug a partir do nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const product = await mongoPrisma.product.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 0,
        weight: weight ? parseFloat(weight) : null,
        imageUrl: imageUrl || null,
        categoryId,
        featured: featured === true || featured === 'true',
      },
      include: { category: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto', details: error.message },
      { status: 500 }
    );
  }
}
