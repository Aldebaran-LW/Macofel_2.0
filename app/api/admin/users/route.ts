import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireStaffDirectoryAdminSession } from '@/lib/require-admin';
import { MASTER_STAFF_CREATION_ROLES } from '@/lib/master-role-policy';
import { isMasterAdminRole, type UserRole } from '@/lib/permissions';
import { validatePdvUserNameInput } from '@/lib/pdv-user-name';

export const dynamic = 'force-dynamic';

/** Lista equipa interna (sem `CLIENT` — clientes ficam em /admin/clientes). */
export async function GET() {
  const auth = await requireStaffDirectoryAdminSession();
  if (!auth.ok) return auth.response;
  const actorRole = (auth.session.user as { role?: string } | undefined)?.role;
  const actorIsMaster = isMasterAdminRole(actorRole);

  const users = await prisma.user.findMany({
    where: actorIsMaster
      ? { role: { not: 'CLIENT' } }
      : { AND: [{ role: { not: 'CLIENT' } }, { role: { not: 'MASTER_ADMIN' } }] },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      pdvUserName: true,
      cpf: true,
      phone: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(users);
}

/**
 * Cria funcionário interno (não-CLIENT). User Name único para login no PDV; senha = mesma do site (email).
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaffDirectoryAdminSession();
  if (!auth.ok) return auth.response;
  const actorRole = (auth.session.user as { role?: string } | undefined)?.role;
  const actorIsMaster = isMasterAdminRole(actorRole);

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, role, pdvUserName, phone } = body ?? {};

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Email, senha, nome, sobrenome e função são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!MASTER_STAFF_CREATION_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Função inválida para cadastro de funcionário.' },
        { status: 400 }
      );
    }
    if (!actorIsMaster && role === 'MASTER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin não pode criar utilizador Master Admin.' },
        { status: 403 }
      );
    }

    const pdvCheck = validatePdvUserNameInput(String(pdvUserName ?? ''));
    if (!pdvCheck.ok) {
      return NextResponse.json({ error: pdvCheck.error }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const takenEmail = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });
    if (takenEmail) {
      return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 400 });
    }

    const takenPdv = await prisma.user.findFirst({
      where: { pdvUserName: pdvCheck.value },
      select: { id: true },
    });
    if (takenPdv) {
      return NextResponse.json(
        { error: 'Este User Name já está em uso por outro funcionário.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        password: hashedPassword,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        role: role as UserRole,
        pdvUserName: pdvCheck.value,
        cpf: null,
        phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
        address: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        pdvUserName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/users:', e);
    return NextResponse.json({ error: 'Erro ao criar utilizador.' }, { status: 500 });
  }
}

