import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getProductBySlug } from '@/lib/mongodb-native';
import {
  isCatalogApiRequestAllowed,
  catalogForbiddenResponse,
  getCatalogCorsHeaders,
} from '@/lib/api-catalog-guard';
import { getAuthenticatedUserId } from '@/lib/get-authenticated-user-id';

export const dynamic = 'force-dynamic';

const MAX_COMMENT = 2000;

function authorLabel(u: { firstName: string; lastName: string }): string {
  const f = (u.firstName || '').trim() || 'Cliente';
  const l = (u.lastName || '').trim();
  return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
}

async function findCompletedOrderWithProduct(userId: string, productId: string) {
  return prisma.order.findFirst({
    where: {
      userId,
      status: 'COMPLETED',
      items: { some: { productId } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
}

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
  const slug = params?.slug?.trim() || '';
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404, headers: cors });
  }
  const productId = product.id;

  const [agg, recentReviews] = await Promise.all([
    prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const count = agg._count._all;
  const averageRating =
    count > 0 && agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null;

  const userId = await getAuthenticatedUserId(req);
  let canReview = false;
  let alreadyReviewed = false;

  if (userId) {
    const existing = await prisma.productReview.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    alreadyReviewed = !!existing;
    if (!alreadyReviewed) {
      const elig = await findCompletedOrderWithProduct(userId, productId);
      canReview = !!elig;
    }
  }

  return NextResponse.json(
    {
      averageRating,
      count,
      canReview,
      alreadyReviewed,
      reviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        authorLabel: authorLabel(r.user),
      })),
    },
    { headers: cors }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Faça login para avaliar' }, { status: 401 });
  }

  const slug = params?.slug?.trim() || '';
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }
  const productId = product.id;

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  const commentRaw = typeof body?.comment === 'string' ? body.comment.trim() : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Escolha uma nota de 1 a 5 estrelas' }, { status: 400 });
  }
  if (commentRaw.length > MAX_COMMENT) {
    return NextResponse.json(
      { error: `Comentário muito longo (máx. ${MAX_COMMENT} caracteres)` },
      { status: 400 }
    );
  }

  const dup = await prisma.productReview.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (dup) {
    return NextResponse.json({ error: 'Já avaliou este produto' }, { status: 409 });
  }

  const order = await findCompletedOrderWithProduct(userId, productId);
  if (!order) {
    return NextResponse.json(
      {
        error:
          'Só é possível avaliar após a compra deste produto estar concluída (pedido com status concluído).',
      },
      { status: 403 }
    );
  }

  await prisma.productReview.create({
    data: {
      userId,
      productId,
      orderId: order.id,
      rating,
      comment: commentRaw ? commentRaw : null,
    },
  });

  return NextResponse.json({ ok: true });
}
