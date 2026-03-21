import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/mongodb-native';
import {
  isCatalogApiRequestAllowed,
  catalogForbiddenResponse,
  getCatalogCorsHeaders,
} from '@/lib/api-catalog-guard';

export const dynamic = 'force-dynamic';

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
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '12');
    const search = searchParams.get('search') ?? '';
    const categorySlug = searchParams.get('category') ?? '';
    const minPrice = parseFloat(searchParams.get('minPrice') ?? '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') ?? '999999');
    const featured = searchParams.get('featured') === 'true';
    const sort = searchParams.get('sort') as 'price_asc' | 'price_desc' | 'name' | 'relevance' | null;

    const result = await getProducts({
      search: search || undefined,
      categorySlug: categorySlug || undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 999999 ? maxPrice : undefined,
      featured: featured || undefined,
      page,
      limit,
      sort: sort && ['price_asc', 'price_desc', 'name', 'relevance'].includes(sort) ? sort : undefined,
    });

    return NextResponse.json(
      {
        products: result.products,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
      { headers: cors }
    );
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error);

    return NextResponse.json(
      {
        error: 'Erro ao buscar produtos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}
