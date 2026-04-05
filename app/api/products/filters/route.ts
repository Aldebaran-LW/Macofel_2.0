import { NextRequest, NextResponse } from 'next/server';
import { getProductFilterOptions } from '@/lib/mongodb-native';
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
    const search = searchParams.get('search') ?? '';
    const categorySlug = searchParams.get('category') ?? '';
    const subcategorias = searchParams.getAll('subcategoria');
    const minPrice = parseFloat(searchParams.get('minPrice') ?? '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') ?? '999999');
    const inStock = searchParams.get('inStock') === 'true';
    const onSale = searchParams.get('onSale') === 'true';

    const result = await getProductFilterOptions({
      search: search || undefined,
      categorySlug: categorySlug || undefined,
      subcategorias: subcategorias.length ? subcategorias : undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 999999 ? maxPrice : undefined,
      inStock: inStock || undefined,
      onSale: onSale || undefined,
      includeSubcategorias: Boolean(categorySlug?.trim()),
    });

    return NextResponse.json(result, { headers: cors });
  } catch (error: any) {
    console.error('Erro ao buscar filtros do catálogo:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar filtros do catálogo',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}

