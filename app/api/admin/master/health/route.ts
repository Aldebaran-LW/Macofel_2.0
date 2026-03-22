import { NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/require-master-admin';

export const dynamic = 'force-dynamic';

/** Confirma sessão Master; útil para testar proteção de APIs exclusivas. */
export async function GET() {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true });
}
