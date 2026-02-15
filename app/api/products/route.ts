import { NextRequest, NextResponse } from 'next/server';
import mongoPrisma from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '12');
    const search = searchParams.get('search') ?? '';
    const categorySlug = searchParams.get('category') ?? '';
    const minPrice = parseFloat(searchParams.get('minPrice') ?? '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') ?? '999999');
    const featured = searchParams.get('featured') === 'true';

    const skip = (page - 1) * limit;

    const where: any = {};
    
    // Aplicar filtro de preço apenas se valores válidos forem fornecidos
    if (minPrice > 0 || maxPrice < 999999) {
      where.price = {};
      if (minPrice > 0) where.price.gte = minPrice;
      if (maxPrice < 999999) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (featured) {
      where.featured = true;
    }

    const [products, total] = await Promise.all([
      mongoPrisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      mongoPrisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error);
    console.error('Detalhes do erro:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar produtos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
