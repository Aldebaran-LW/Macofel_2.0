import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canManageStaffDirectory, isAdminDashboardRole } from '@/lib/permissions';

/** Para API routes: sessão obrigatória com role de Admin (inclui Master Admin e Gerente site). */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdminDashboardRole(role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Acesso exclusivo Admin' }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}

/** Equipa interna: `/api/admin/users` e páginas `/admin/equipe`, `/admin/senhas` — só ADMIN e MASTER. */
export async function requireStaffDirectoryAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canManageStaffDirectory(role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Acesso exclusivo Admin (gestão de equipa)' }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}

