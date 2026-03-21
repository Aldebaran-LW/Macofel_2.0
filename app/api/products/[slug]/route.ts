import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/mongodb-native';
import {
  isCatalogApiRequestAllowed,
  catalogForbiddenResponse,
  getCatalogCorsHeaders,
} from '@/lib/api-catalog-guard';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCatalogCorsHeaders(req) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!isCatalogApiRequestAllowed(req)) {
    return catalogForbiddenResponse();
  }

  const cors = getCatalogCorsHeaders(req);

  try {
    const product = await getProductBySlug(params?.slug || '');

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404, headers: cors }
      );
    }

    return NextResponse.json(product, { headers: cors });
  } catch (error: any) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500, headers: cors }
    );
  }
}
