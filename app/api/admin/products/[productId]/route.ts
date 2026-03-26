import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
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
    const { name, description, price, stock, minStock, weight, imageUrl, categoryId, featured } = body;

    const updateData: any = {};
    const current = await mongoPrisma.product.findUnique({
      where: { id: params?.productId },
      select: { name: true, weight: true, imageUrl: true, dimensionsCm: true, imageUrls: true },
    });

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
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true';

    const lookupName = typeof name === 'string' && name.trim() ? name.trim() : current?.name;
    const needsAutoFill =
      !!lookupName &&
      (
        (updateData.weight ?? current?.weight ?? null) == null ||
        !(updateData.imageUrl ?? current?.imageUrl) ||
        !(updateData.dimensionsCm ?? current?.dimensionsCm)
      );
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
          if (!(updateData.dimensionsCm ?? current?.dimensionsCm) && enriched.dimensions_cm) {
            updateData.dimensionsCm = enriched.dimensions_cm;
          }
          if ((!Array.isArray(current?.imageUrls) || current?.imageUrls.length === 0) && enriched.photos?.length) {
            updateData.imageUrls = enriched.photos;
          }
        }
      } catch {
        // segue atualização sem enriquecimento
      }
    }

    const product = await mongoPrisma.product.update({
      where: { id: params?.productId },
      data: updateData,
      include: { category: true },
    });

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
