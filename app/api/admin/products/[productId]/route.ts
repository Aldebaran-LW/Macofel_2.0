import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';

export const dynamic = 'force-dynamic';

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

    const body = await req.json();
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

    const updateData: Record<string, unknown> = {};
    const current = await mongoPrisma.product.findUnique({
      where: { id: params?.productId },
      select: { name: true, weight: true, imageUrl: true },
    });

    let dimensionsCm: string | null = null;
    let imageUrls: string[] = [];
    try {
      const db = await connectToDatabase();
      const raw = await db.collection('products').findOne(
        { _id: new ObjectId(params?.productId) },
        { projection: { dimensionsCm: 1, imageUrls: 1 } }
      );
      dimensionsCm = raw?.dimensionsCm != null ? String(raw.dimensionsCm) : null;
      imageUrls = raw && Array.isArray(raw.imageUrls) ? raw.imageUrls.map(String) : [];
    } catch {
      // ignora — enriquecimento continua só com campos Prisma
    }

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
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (minStock !== undefined) updateData.minStock = parseInt(minStock) || 0;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(String(weight)) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true';
    if (codigo !== undefined) {
      updateData.codigo = codigo != null && String(codigo).trim() !== '' ? String(codigo).trim() : null;
    }
    if (cost !== undefined) {
      const c = cost === '' || cost == null ? null : parseFloat(String(cost));
      updateData.cost = c != null && Number.isFinite(c) ? c : null;
    }
    if (pricePrazo !== undefined) {
      const pp = pricePrazo === '' || pricePrazo == null ? null : parseFloat(String(pricePrazo));
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
    if (status !== undefined) {
      updateData.status = status === false || status === 'false' ? false : true;
    }

    const lookupName = typeof name === 'string' && name.trim() ? name.trim() : current?.name;
    const needsAutoFill =
      !!lookupName &&
      ((updateData.weight ?? current?.weight ?? null) == null ||
        !(updateData.imageUrl ?? current?.imageUrl) ||
        !dimensionsCm?.trim() ||
        imageUrls.length === 0);

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

    const product = await mongoPrisma.product.update({
      where: { id: params?.productId },
      data: updateData as any,
      include: { category: true },
    });

    if (Object.keys(extraMongo).length > 0) {
      try {
        const db = await connectToDatabase();
        await db
          .collection('products')
          .updateOne({ _id: new ObjectId(params?.productId) }, { $set: extraMongo });
      } catch {
        // não falha o PATCH
      }
    }

    return NextResponse.json(product);
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

    await mongoPrisma.product.delete({
      where: { id: params?.productId },
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
