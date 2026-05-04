import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireStaffDirectoryAdminSession } from '@/lib/require-admin';
import { isMasterAdminRole } from '@/lib/permissions';
import { validatePdvUserNameInput } from '@/lib/pdv-user-name';

export const dynamic = 'force-dynamic';

/** Atualiza User Name do PDV (único entre funcionários). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireStaffDirectoryAdminSession();
  if (!auth.ok) return auth.response;
  const actorRole = (auth.session.user as { role?: string } | undefined)?.role;
  const actorIsMaster = isMasterAdminRole(actorRole);

  const userId = params?.userId;
  if (!userId) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { pdvUserName } = body ?? {};

    const pdvCheck = validatePdvUserNameInput(String(pdvUserName ?? ''));
    if (!pdvCheck.ok) {
      return NextResponse.json({ error: pdvCheck.error }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { pdvUserName: pdvCheck.value, NOT: { id: userId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Este User Name já está em uso por outro funcionário.' },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }
    if (!actorIsMaster && target.role === 'MASTER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin não pode editar utilizador Master Admin.' },
        { status: 403 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { pdvUserName: pdvCheck.value },
      select: {
        id: true,
        email: true,
        pdvUserName: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }
    console.error('PATCH /api/admin/users/[userId]:', e);
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }
}

