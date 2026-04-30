import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import { validatePdvUserNameInput } from '@/lib/pdv-user-name';

export const dynamic = 'force-dynamic';

/** Atualiza dados do funcionário (equipa interna, não-CLIENT). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const userId = params?.userId;
  if (!userId) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { pdvUserName, email, firstName, lastName, phone } = body ?? {};

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }
    if (target.role === 'CLIENT') {
      return NextResponse.json(
        { error: 'Este utilizador é Cliente. Edite em Admin → Clientes.' },
        { status: 409 }
      );
    }

    const updateData: {
      pdvUserName?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    } = {};

    if (pdvUserName !== undefined) {
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
      updateData.pdvUserName = pdvCheck.value;
    }

    if (email !== undefined) {
      const emailNorm = String(email).trim().toLowerCase();
      if (!emailNorm) {
        return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
      }
      const takenEmail = await prisma.user.findFirst({
        where: { email: emailNorm, NOT: { id: userId } },
        select: { id: true },
      });
      if (takenEmail) {
        return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 400 });
      }
      updateData.email = emailNorm;
    }

    if (firstName !== undefined) {
      const v = String(firstName).trim();
      if (!v) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
      updateData.firstName = v;
    }

    if (lastName !== undefined) {
      const v = String(lastName).trim();
      if (!v) return NextResponse.json({ error: 'Sobrenome é obrigatório.' }, { status: 400 });
      updateData.lastName = v;
    }

    if (phone !== undefined) {
      const v = String(phone ?? '').trim();
      updateData.phone = v ? v : null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        pdvUserName: true,
        phone: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e: unknown) {
    console.error('PATCH /api/admin/master/users/[userId]:', e);
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }
}
