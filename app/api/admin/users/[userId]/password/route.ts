import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireStaffDirectoryAdminSession } from '@/lib/require-admin';
import { isMasterAdminRole } from '@/lib/permissions';
import { hashPassword } from '@/lib/password-hash';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

const MIN_LEN = 8;
const MAX_LEN = 128;

export async function POST(
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

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const plain = typeof body.password === 'string' ? body.password : '';
  if (plain.length < MIN_LEN || plain.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Senha deve ter entre ${MIN_LEN} e ${MAX_LEN} caracteres` },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }
  if (!actorIsMaster && target.role === 'MASTER_ADMIN') {
    return NextResponse.json(
      { error: 'Admin não pode redefinir senha de Master Admin.' },
      { status: 403 }
    );
  }

  const hashedPassword = await hashPassword(plain);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  const actor = auth.session.user as { id?: string; email?: string | null };
  await writeAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    action: 'user.password_reset_by_admin',
    targetType: 'user',
    targetId: target.id,
    metadata: { targetEmail: target.email },
  });

  return NextResponse.json({ ok: true });
}

