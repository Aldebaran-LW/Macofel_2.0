import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import {
  createHeroSlide,
  deleteHeroSlide,
  getAllHeroSlides,
  updateHeroSlide,
} from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false as const, res: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }

  const userRole = (session.user as any).role;
  if (!isAdminDashboardRole(userRole)) {
    return { ok: false as const, res: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) return auth.res;

    const slides = await getAllHeroSlides();
    return NextResponse.json(slides);
  } catch (error: any) {
    console.error('Erro ao buscar slides do hero:', error);
    return NextResponse.json({ error: 'Erro ao buscar slides do hero' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { imageUrl, subtitle, title, text, href, order, active } = body ?? {};

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL da imagem é obrigatória' }, { status: 400 });
    }

    const id = await createHeroSlide({
      imageUrl,
      subtitle: subtitle ?? null,
      title: title ?? null,
      text: text ?? null,
      href: href ?? null,
      order: order ?? 0,
      active: active ?? true,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar slide do hero:', error);
    return NextResponse.json({ error: 'Erro ao criar slide do hero' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { id, imageUrl, subtitle, title, text, href, order, active } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: 'ID do slide é obrigatório' }, { status: 400 });
    }

    const updated = await updateHeroSlide(String(id), {
      imageUrl,
      subtitle,
      title,
      text,
      href,
      order,
      active,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Slide não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar slide do hero:', error);
    return NextResponse.json({ error: 'Erro ao atualizar slide do hero' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) return auth.res;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do slide é obrigatório' }, { status: 400 });
    }

    const deleted = await deleteHeroSlide(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Slide não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar slide do hero:', error);
    return NextResponse.json({ error: 'Erro ao deletar slide do hero' }, { status: 500 });
  }
}

