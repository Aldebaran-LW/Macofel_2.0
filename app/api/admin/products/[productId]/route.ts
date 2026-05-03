import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

async function readProductFromMongo(productId: string) {
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
    categoryId: cid instanceof ObjectId ? cid.toString() : typeof cid === 'string' ? cid : '',
    featured: Boolean(p.featured),
    codigo: p.codigo != null ? String(p.codigo) : null,
    cost: typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : null,
    pricePrazo: typeof p.pricePrazo === 'number' && Number.isFinite(p.pricePrazo) ? p.pricePrazo : null,
    unidade: p.unidade != null ? String(p.unidade) : null,
    codBarra: p.codBarra != null ? String(p.codBarra) : null,
    marca: p.marca != null ? String(p.marca) : null,
    subcategoria: p.subcategoria != null ? String(p.subcategoria) : null,
    origin: p.origin != null ? String(p.origin) : null,
    status: statusBool,
    category: cat ? { id: cat._id.toString(), name: String(cat.name ?? '') } : { id: '', name: '—' },
    showInstallmentsOnStore: p.showInstallmentsOnStore === true,
  };
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

function normalizeImageUrl(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (s.startsWith('/')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

function normalizeImageUrls(v: unknown): string[] | null {
  if (v == null) return null;
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    const u = normalizeImageUrl(item);
    if (u) out.push(u);
  }
  // dedupe mantendo ordem
  const uniq = Array.from(new Set(out));
  return uniq;
}

// Atualizar produto
export async function PATCH(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const productId = params?.productId;
    if (!productId || !ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      stock,
      minStock,
      weight,
      imageUrl,
      imageUrls: imageUrlsBody,
      categoryId,
      featured,
      codigo,
      cost,
      pricePrazo,
      unidade,
      codBarra,
      marca,
      subcategoria,
      status,
      showInstallmentsOnStore,
    } = body;

    const updateData: Record<string, unknown> = {};

    const db = await connectToDatabase();
    const productsCol = db.collection('products');

    const currentRaw: any = await productsCol.findOne(
      { _id: new ObjectId(productId) },
      { projection: { name: 1, weight: 1, imageUrl: 1, dimensionsCm: 1, imageUrls: 1 } }
    );
    if (!currentRaw) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const current = {
      name: currentRaw?.name != null ? String(currentRaw.name) : '',
      weight: currentRaw?.weight ?? null,
      imageUrl: currentRaw?.imageUrl ?? null,
    };
    const dimensionsCm: string | null =
      currentRaw?.dimensionsCm != null ? String(currentRaw.dimensionsCm) : null;
    const imageUrls: string[] =
      currentRaw && Array.isArray(currentRaw.imageUrls) ? currentRaw.imageUrls.map(String) : [];

    if (name !== undefined) {
      updateData.name = name;
      // Gerar novo slug se o nome mudou
      updateData.slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) {
      const priceNum = parsePriceInput(price);
      if (!Number.isFinite(priceNum)) {
        return NextResponse.json({ error: 'Preço inválido' }, { status: 400 });
      }
      updateData.price = priceNum;
    }
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (minStock !== undefined) updateData.minStock = parseInt(minStock) || 0;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(String(weight)) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (imageUrlsBody !== undefined) {
      const normalized = normalizeImageUrls(imageUrlsBody);
      if (normalized) (updateData as any).imageUrls = normalized;
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true';
    // Mesmos campos extra do model Product (import LW / painel).
    if (codigo !== undefined) {
      updateData.codigo = codigo != null && String(codigo).trim() !== '' ? String(codigo).trim() : null;
    }
    if (cost !== undefined) {
      const c = cost === '' || cost == null ? null : parsePriceInput(cost);
      updateData.cost = c != null && Number.isFinite(c) ? c : null;
    }
    if (pricePrazo !== undefined) {
      const pp = pricePrazo === '' || pricePrazo == null ? null : parsePriceInput(pricePrazo);
      updateData.pricePrazo = pp != null && Number.isFinite(pp) ? pp : null;
    }
    if (unidade !== undefined) {
      updateData.unidade =
        unidade != null && String(unidade).trim() !== '' ? String(unidade).trim() : null;
    }
    if (codBarra !== undefined) {
      updateData.codBarra =
        codBarra != null && String(codBarra).replace(/\D/g, '') !== ''
          ? String(codBarra).replace(/\D/g, '')
          : null;
    }
    if (marca !== undefined) {
      updateData.marca =
        marca != null && String(marca).trim() !== '' ? String(marca).trim() : null;
    }
    if (subcategoria !== undefined) {
      (updateData as any).subcategoria =
        subcategoria != null && String(subcategoria).trim() !== ''
          ? String(subcategoria).trim()
          : null;
    }
    if (status !== undefined) {
      updateData.status = status === false || status === 'false' ? false : true;
    }
    if (showInstallmentsOnStore !== undefined) {
      updateData.showInstallmentsOnStore =
        showInstallmentsOnStore === true || showInstallmentsOnStore === 'true';
    }

    const lookupName = typeof name === 'string' && name.trim() ? name.trim() : current?.name;
    const needsAutoFill =
      !!lookupName &&
      ((updateData.weight ?? current?.weight ?? null) == null ||
        !(updateData.imageUrl ?? current?.imageUrl) ||
        !dimensionsCm?.trim() ||
        imageUrls.length === 0);

    // Se vier uma lista de imagens mas nenhuma "principal", escolher a primeira
    const incomingUrls = normalizeImageUrls(imageUrlsBody);
    if (
      updateData.imageUrl === undefined &&
      incomingUrls &&
      incomingUrls.length > 0 &&
      !(current?.imageUrl && String(current.imageUrl).trim())
    ) {
      updateData.imageUrl = incomingUrls[0];
    }

    const extraMongo: Record<string, unknown> = {};
    if (needsAutoFill && lookupName) {
      try {
        const enriched = await getBuscarProdutoInfo(lookupName);
        if (enriched) {
          if ((updateData.weight ?? current?.weight ?? null) == null && enriched.weight_grams != null) {
            updateData.weight = Number((enriched.weight_grams / 1000).toFixed(3));
          }
          if (!(updateData.imageUrl ?? current?.imageUrl) && enriched.photos?.[0]) {
            updateData.imageUrl = enriched.photos[0];
          }
          if (!dimensionsCm?.trim() && enriched.dimensions_cm) {
            extraMongo.dimensionsCm = enriched.dimensions_cm;
          }
          if (imageUrls.length === 0 && enriched.photos?.length) {
            extraMongo.imageUrls = enriched.photos;
          }
        }
      } catch {
        // segue atualização sem enriquecimento
      }
    }

    const $set: Record<string, unknown> = {
      ...updateData,
      ...(Object.keys(extraMongo).length ? extraMongo : {}),
      updatedAt: new Date(),
    };
    /** Remove campo legado `showOnHome` ao inativar (limpeza Mongo). */
    const payload: Record<string, unknown> = { $set };
    if ($set.status === false) {
      payload.$unset = { showOnHome: '' };
    }
    const result = await productsCol.updateOne({ _id: new ObjectId(productId) }, payload);
    if (result.matchedCount <= 0) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const normalized = await readProductFromMongo(productId);
    if (!normalized) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const u = session.user as { id?: string; email?: string | null };
    const fieldKeys = Object.keys($set).filter((k) => k !== 'updatedAt');
    await writeAuditLog({
      source: 'site',
      actorId: u.id ?? null,
      actorEmail: u.email ?? null,
      action: 'site.product.updated',
      targetType: 'product',
      targetId: productId,
      metadata: { fields: fieldKeys },
    });

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar produto', details: error.message },
      { status: 500 }
    );
  }
}

// Deletar produto
export async function DELETE(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const productId = params?.productId;
    if (!productId || !ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const res = await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
    if (res.deletedCount <= 0) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const u = session.user as { id?: string; email?: string | null };
    await writeAuditLog({
      source: 'site',
      actorId: u.id ?? null,
      actorEmail: u.email ?? null,
      action: 'site.product.deleted',
      targetType: 'product',
      targetId: productId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar produto', details: error.message },
      { status: 500 }
    );
  }
}




