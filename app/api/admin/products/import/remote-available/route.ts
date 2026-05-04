import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { isRenderCatalogImportConfigured } from '@/lib/render-catalog-import-env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessAdminCatalogSession((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  return NextResponse.json({ available: isRenderCatalogImportConfigured() });
}
