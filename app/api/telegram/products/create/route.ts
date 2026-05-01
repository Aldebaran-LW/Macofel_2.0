import { NextRequest, NextResponse } from 'next/server';
import mongoPrisma from '@/lib/mongodb';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';

export const dynamic = 'force-dynamic';

function canCreateQuickProduct(role: string | undefined): boolean {
  if (!role?.trim() || role === 'CLIENT') return false;
  return true;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

/** Criação mínima pelo Telegram (mesma base Prisma que o painel). */
export async function POST(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!canCreateQuickProduct(linked.user.role)) {
      return NextResponse.json({ error: 'Sem permissão para criar produto' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const categoryId = String(body?.categoryId ?? '').trim();
    const priceNum = parsePriceInput(body?.price);
    const stock = Math.trunc(Number(body?.stock ?? 0)) || 0;

    if (!name || !description || !categoryId || !Number.isFinite(priceNum)) {
      return NextResponse.json(
        { error: 'Obrigatório: name, description, categoryId, price (número válido)' },
        { status: 400 }
      );
    }

    const cat = await mongoPrisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: 'categoryId não encontrada' }, { status: 400 });
    }

    let slug = slugify(name);
    let tries = 0;
    while (tries < 8) {
      const clash = await mongoPrisma.product.findUnique({ where: { slug } });
      if (!clash) break;
      slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
      tries += 1;
    }

    const product = await mongoPrisma.product.create({
      data: {
        name,
        slug,
        description,
        price: priceNum,
        stock,
        minStock: 0,
        categoryId,
        featured: false,
        origin: 'manual',
        status: true,
      },
      include: { category: true },
    });

    return NextResponse.json(
      { id: product.id, name: product.name, slug: product.slug, price: product.price },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[api/telegram/products/create]', error);
    return NextResponse.json({ error: 'Erro ao criar produto', details: msg }, { status: 500 });
  }
}
