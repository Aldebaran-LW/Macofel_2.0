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
    const marcas = searchParams.getAll('marca');
    const materiais = searchParams.getAll('material');
    const acabamentos = searchParams.getAll('acabamento');
    const tipos = searchParams.getAll('tipo');
    const bitolas = searchParams.getAll('bitola');
    const voltagens = searchParams.getAll('voltagem');
    const subcategorias = searchParams.getAll('subcategoria');
    const minPrice = parseFloat(searchParams.get('minPrice') ?? '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') ?? '999999');
    const featured = searchParams.get('featured') === 'true';
    const inStock = searchParams.get('inStock') === 'true';
    const onSale = searchParams.get('onSale') === 'true';
    const rawSort = searchParams.get('sort');
    const sortParam = rawSort === 'name' ? 'name_asc' : rawSort;
    const sort = sortParam as
      | 'relevance'
      | 'price_asc'
      | 'price_desc'
      | 'name_asc'
      | 'newest'
      | 'best_selling'
      | null;

    const result = await getProducts({
      search: search || undefined,
      categorySlug: categorySlug || undefined,
      subcategorias: subcategorias.length ? subcategorias : undefined,
      marcas: marcas.length ? marcas : undefined,
      materiais: materiais.length ? materiais : undefined,
      acabamentos: acabamentos.length ? acabamentos : undefined,
      tipos: tipos.length ? tipos : undefined,
      bitolas: bitolas.length ? bitolas : undefined,
      voltagens: voltagens.length ? voltagens : undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 999999 ? maxPrice : undefined,
      inStock: inStock || undefined,
      onSale: onSale || undefined,
      featured: featured || undefined,
      page,
      limit,
      sort:
        sort &&
        ['relevance', 'price_asc', 'price_desc', 'name_asc', 'newest', 'best_selling'].includes(sort)
          ? sort
          : undefined,
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
