import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';
import { applyExtraFieldsFromEnrichment } from '@/lib/product-web-enrichment';

export const dynamic = 'force-dynamic';

/** Lista produtos para o painel (sem passar pelo guard do catálogo público). Inclui inativos. */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '200', 10)));

    const products = await mongoPrisma.product.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { category: true },
    });

    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      stock: p.stock,
      minStock: p.minStock,
      weight: p.weight,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      featured: p.featured,
      codigo: p.codigo ?? null,
      cost: p.cost ?? null,
      pricePrazo: p.pricePrazo ?? null,
      unidade: p.unidade ?? null,
      codBarra: p.codBarra ?? null,
      status: p.status,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : { id: p.categoryId, name: '—' },
    }));

    return NextResponse.json({ products: mapped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('GET /api/admin/products:', error);
    return NextResponse.json(
      { error: 'Erro ao listar produtos', details: message },
      { status: 500 }
    );
  }
}

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
    // Campos opcionais alinhados ao relatório LW: codigo, custo, preço prazo, unidade, EAN, ativo.
    const {
      name,
      description,
      price,
      stock,
      minStock,
      weight,
      imageUrl,
      categoryId,
      featured,
      codigo,
      cost,
      pricePrazo,
      unidade,
      codBarra,
      status,
    } = body;

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

    const codigoStr =
      codigo != null && String(codigo).trim() !== '' ? String(codigo).trim() : null;
    const costNum = cost != null && String(cost).trim() !== '' ? parsePriceInput(cost) : null;
    const pricePrazoNum =
      pricePrazo != null && String(pricePrazo).trim() !== '' ? parsePriceInput(pricePrazo) : null;
    const unidadeStr =
      unidade != null && String(unidade).trim() !== '' ? String(unidade).trim() : null;
    const codBarraStr =
      codBarra != null && String(codBarra).replace(/\D/g, '') !== ''
        ? String(codBarra).replace(/\D/g, '')
        : null;
    const statusBool = status === false || status === 'false' ? false : true;

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
        codigo: codigoStr,
        cost: costNum != null && Number.isFinite(costNum) ? costNum : null,
        pricePrazo:
          pricePrazoNum != null && Number.isFinite(pricePrazoNum) && pricePrazoNum > 0
            ? pricePrazoNum
            : null,
        unidade: unidadeStr,
        codBarra: codBarraStr,
        status: statusBool,
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







