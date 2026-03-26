import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';

/** Para API routes: sessão obrigatória com role de Admin (inclui Master Admin). */
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

