import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { getAdminProductFilterOptionsFromMongo } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

/** Opções para filtros do admin (marcas/subcategorias). */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const result = await getAdminProductFilterOptionsFromMongo(searchParams);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('GET /api/admin/products/filters:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar opções de filtros', details: message },
      { status: 500 }
    );
  }
}

