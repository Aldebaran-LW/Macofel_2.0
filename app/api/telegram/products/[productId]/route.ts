import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function isStaff(role: string | undefined): boolean {
  return !!role?.trim() && role !== 'CLIENT';
}

function canFullProductEdit(role: string | undefined): boolean {
  return hasPermission(role, 'admin:products_crud');
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

async function readProductTelegram(productId: string) {
  if (!ObjectId.isValid(productId)) return null;
  const db = await connectToDatabase();
  const products = db.collection('products');
  const categories = db.collection('categories');
  const oid = new ObjectId(productId);
  const p: any = await products.findOne({ _id: oid });
  if (!p) return null;

  const cid = p.categoryId;
  let cat: any = null;
  if (cid instanceof ObjectId) cat = await categories.findOne({ _id: cid });
  else if (typeof cid === 'string' && cid.trim() && ObjectId.isValid(cid)) {
    cat = await categories.findOne({ _id: new ObjectId(cid) });
  }

  const rawGallery = Array.isArray(p.imageUrls) ? p.imageUrls.map(String).filter(Boolean) : [];

  const statusRaw = p.status;
  const statusBool = statusRaw === false ? false : true;

  return {
    id: p._id.toString(),
    name: String(p.name ?? ''),
    slug: String(p.slug ?? ''),
    description: String(p.description ?? ''),
    price: typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : Number(p.price) || 0,
    stock: typeof p.stock === 'number' && Number.isFinite(p.stock) ? Math.trunc(p.stock) : Number(p.stock) || 0,
    minStock:
      typeof p.minStock === 'number' && Number.isFinite(p.minStock) ? Math.trunc(p.minStock) : null,
    weight: typeof p.weight === 'number' && Number.isFinite(p.weight) ? p.weight : p.weight ?? null,
    imageUrl: p.imageUrl ?? null,
    imageUrls: rawGallery.length ? rawGallery : null,
    categoryId: cid instanceof ObjectId ? cid.toString() : typeof cid === 'string' ? cid : '',
    featured: Boolean(p.featured),
    codigo: p.codigo != null ? String(p.codigo) : null,
    cost: typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : null,
    pricePrazo: typeof p.pricePrazo === 'number' && Number.isFinite(p.pricePrazo) ? p.pricePrazo : null,
    unidade: p.unidade != null ? String(p.unidade) : null,
    codBarra: p.codBarra != null ? String(p.codBarra) : null,
    marca: p.marca != null ? String(p.marca) : null,
    subcategoria: p.subcategoria != null ? String(p.subcategoria) : null,
    status: statusBool,
    category: cat ? { id: cat._id.toString(), name: String(cat.name ?? '') } : { id: '', name: '—' },
  };
}

/** Leitura para equipe (Telegram = vista alternativa ao painel). */
export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const linked = await requireLinkedTelegramUser(_req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!isStaff(linked.user.role)) {
      return NextResponse.json({ error: 'Apenas contas de equipe (não cliente)' }, { status: 403 });
    }

    const productId = String(params?.productId ?? '').trim();
    const doc = await readProductTelegram(productId);
    if (!doc) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error: unknown) {
    console.error('[api/telegram/products/:id GET]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** Atualização parcial — mesmo banco que o site; permissões alinhadas ao papel. */
export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!isStaff(linked.user.role)) {
      return NextResponse.json({ error: 'Apenas contas de equipe' }, { status: 403 });
    }

    const productId = String(params?.productId ?? '').trim();
    if (!productId || !ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'productId inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const full = canFullProductEdit(linked.user.role);
    const staffKeys = new Set([
      'name',
      'description',
      'price',
      'stock',
      'minStock',
      'codigo',
      'codBarra',
      'marca',
      'unidade',
      'status',
    ]);
    const adminKeys = new Set([
      ...staffKeys,
      'categoryId',
      'featured',
      'cost',
      'pricePrazo',
      'weight',
      'imageUrl',
      'imageUrls',
      'subcategoria',
    ]);

    const allowed = full ? adminKeys : staffKeys;
    const updateData: Record<string, unknown> = {};

    for (const key of Object.keys(body)) {
      if (!allowed.has(key)) continue;
      const v = (body as any)[key];
      if (key === 'price') {
        const n = parsePriceInput(v);
        if (!Number.isFinite(n)) continue;
        updateData.price = n;
      } else if (key === 'cost' || key === 'pricePrazo') {
        const n = v === '' || v == null ? null : parsePriceInput(v);
        updateData[key] = n != null && Number.isFinite(n) ? n : null;
      } else if (key === 'stock' || key === 'minStock') {
        updateData[key] = Math.trunc(Number(v)) || 0;
      } else if (key === 'weight') {
        updateData.weight = v === '' || v == null ? null : parseFloat(String(v));
      } else if (key === 'featured') {
        updateData.featured = !(v === false || v === 'false');
      } else if (key === 'status') {
        updateData.status = !(v === false || v === 'false');
      } else if (key === 'categoryId') {
        const id = String(v ?? '').trim();
        if (ObjectId.isValid(id)) updateData.categoryId = id;
      } else if (key === 'imageUrls') {
        if (Array.isArray(v)) {
          updateData.imageUrls = v.map(String).filter(Boolean);
        }
      } else if (key === 'codBarra') {
        updateData.codBarra =
          v != null && String(v).replace(/\D/g, '') !== '' ? String(v).replace(/\D/g, '') : null;
      } else if (key === 'description') {
        updateData.description = String(v ?? '');
      } else if (key === 'name' && String(v ?? '').trim()) {
        const nm = String(v).trim();
        updateData.name = nm;
        updateData.slug = nm
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      } else if (key === 'codigo') {
        updateData.codigo = v != null && String(v).trim() !== '' ? String(v).trim() : null;
      } else if (key === 'marca' || key === 'unidade' || key === 'subcategoria') {
        updateData[key] = v != null && String(v).trim() !== '' ? String(v).trim() : null;
      } else if (key === 'imageUrl') {
        const s = String(v ?? '').trim();
        updateData.imageUrl = s || null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido ou válido' }, { status: 400 });
    }

    updateData.updatedAt = new Date();

    const db = await connectToDatabase();
    const res = await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { $set: updateData }
    );
    if (res.matchedCount <= 0) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const normalized = await readProductTelegram(productId);
    return NextResponse.json(normalized);
  } catch (error: unknown) {
    console.error('[api/telegram/products/:id PATCH]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
