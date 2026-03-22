import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isMasterAdminRole } from '@/lib/permissions';

/** Para API routes: sessão obrigatória com role MASTER_ADMIN. */
export async function requireMasterAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isMasterAdminRole(role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Acesso exclusivo Master Admin' }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}
