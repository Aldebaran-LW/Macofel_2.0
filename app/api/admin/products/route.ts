import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';
import { applyExtraFieldsFromEnrichment } from '@/lib/product-web-enrichment';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- cliente gerado em node_modules/.prisma-mongodb
// @ts-ignore
import type { Prisma } from '../../../../node_modules/.prisma-mongodb';

export const dynamic = 'force-dynamic';

function buildAdminProductWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  const q = (searchParams.get('q') ?? '').trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
        { codBarra: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const categoryId = searchParams.get('categoryId');
  if (categoryId && categoryId !== 'all') {
    and.push({ categoryId });
  }

  const catalog = searchParams.get('catalog') ?? 'all';
  if (catalog === 'active') and.push({ status: true });
  if (catalog === 'inactive') and.push({ status: false });

  const stock = searchParams.get('stock') ?? 'all';
  if (stock === 'in_stock') and.push({ stock: { gt: 0 } });
  if (stock === 'out') and.push({ stock: { lte: 0 } });

  const featured = searchParams.get('featured') ?? 'all';
  if (featured === 'yes') and.push({ featured: true });
  if (featured === 'no') and.push({ featured: false });

  return and.length ? { AND: and } : {};
}

/** Lista produtos para o painel (sem passar pelo guard do catálogo público). Inclui inativos. Paginação: page, limit (máx. 200). */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const skip = (page - 1) * limit;

    const where = buildAdminProductWhere(searchParams);

    const [total, products] = await Promise.all([
      mongoPrisma.product.count({ where }),
      mongoPrisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: { updatedAt: 'desc' },
        include: { category: true },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

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
      marca: p.marca ?? null,
      status: p.status,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : { id: p.categoryId, name: '—' },
    }));

    return NextResponse.json({
      products: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
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
      marca,
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
    const marcaStr =
      marca != null && String(marca).trim() !== '' ? String(marca).trim() : null;
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
        marca: marcaStr,
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







