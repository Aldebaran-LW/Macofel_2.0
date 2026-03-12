import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getAllHeroImages, createHeroImage, deleteHeroImage, updateHeroImage } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

// GET - Listar todas as imagens do hero
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const images = await getAllHeroImages();
    return NextResponse.json(images);
  } catch (error: any) {
    console.error('Erro ao buscar imagens do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar imagens do hero' },
      { status: 500 }
    );
  }
}

// POST - Criar nova imagem do hero
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { imageUrl, alt, order, active, linkType, productId, categorySlug, linkUrl, displayType, animationOrder } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL da imagem é obrigatória' },
        { status: 400 }
      );
    }

    const id = await createHeroImage({
      imageUrl,
      alt,
      order: order ?? 0,
      active: active ?? true,
      linkType: linkType || null,
      productId: productId || null,
      categorySlug: categorySlug || null,
      linkUrl: linkUrl || null,
      displayType: displayType || 'grid',
      animationOrder: animationOrder ?? 0,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar imagem do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao criar imagem do hero' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar imagem do hero
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, imageUrl, alt, order, active, linkType, productId, categorySlug, linkUrl, displayType, animationOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da imagem é obrigatório' },
        { status: 400 }
      );
    }

    const updated = await updateHeroImage(id, {
      imageUrl,
      alt,
      order,
      active,
      linkType,
      productId,
      categorySlug,
      linkUrl,
      displayType,
      animationOrder,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar imagem do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar imagem do hero' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar imagem do hero
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID da imagem é obrigatório' },
        { status: 400 }
      );
    }

    const deleted = await deleteHeroImage(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar imagem do hero:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar imagem do hero' },
      { status: 500 }
    );
  }
}
