import { NextRequest, NextResponse } from 'next/server';
import mongoPrisma from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await mongoPrisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    console.error('Detalhes do erro:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar categorias',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
