import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireStaffDirectoryAdminSession } from '@/lib/require-admin';
import { parseAssignableRole, validateMasterRoleDemotion } from '@/lib/master-role-policy';
import { isMasterAdminRole, type UserRole } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

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

  let body: { role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const newRole = parseAssignableRole(body?.role);
  if (!newRole) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  const currentRole = target.role as UserRole;
  if (!actorIsMaster && (currentRole === 'MASTER_ADMIN' || newRole === 'MASTER_ADMIN')) {
    return NextResponse.json(
      { error: 'Admin não pode alterar utilizador Master Admin.' },
      { status: 403 }
    );
  }
  if (currentRole === newRole) {
    return NextResponse.json({
      ok: true,
      unchanged: true,
      user: { id: target.id, email: target.email, role: currentRole },
    });
  }

  const masterAdminCount = await prisma.user.count({
    where: { role: 'MASTER_ADMIN' },
  });

  const check = validateMasterRoleDemotion({
    targetCurrentRole: currentRole,
    newRole,
    masterAdminCount,
  });

  if (!check.ok) {
    return NextResponse.json({ error: check.message, code: check.code }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  const actor = auth.session.user as { id?: string; email?: string | null };
  await writeAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: updated.id,
    metadata: {
      targetEmail: updated.email,
      fromRole: currentRole,
      toRole: newRole,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}

