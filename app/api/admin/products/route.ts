import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';
import { applyExtraFieldsFromEnrichment } from '@/lib/product-web-enrichment';

export const dynamic = 'force-dynamic';

function parsePriceInput(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

// Criar novo produto
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, stock, minStock, weight, imageUrl, categoryId, featured } = body;

    const priceNum = parsePriceInput(price);
    if (!name || !description || !categoryId || !Number.isFinite(priceNum)) {
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

    let enriched: Awaited<ReturnType<typeof getBuscarProdutoInfo>> = null;
    try {
      enriched = await getBuscarProdutoInfo(String(name));
    } catch {
      enriched = null;
    }

    const resolvedWeightKg =
      weight != null && String(weight).trim() !== ''
        ? parseFloat(String(weight))
        : enriched?.weight_grams != null
          ? Number((enriched.weight_grams / 1000).toFixed(3))
          : null;

    const resolvedImageUrl =
      imageUrl && String(imageUrl).trim() !== ''
        ? String(imageUrl).trim()
        : enriched?.photos?.[0] || null;

    const product = await mongoPrisma.product.create({
      data: {
        name,
        slug,
        description,
        price: priceNum,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 0,
        weight: resolvedWeightKg,
        imageUrl: resolvedImageUrl,
        categoryId,
        featured: featured === true || featured === 'true',
      },
      include: { category: true },
    });

    await applyExtraFieldsFromEnrichment(product.id, enriched);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto', details: error.message },
      { status: 500 }
    );
  }
}
