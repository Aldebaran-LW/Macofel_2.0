import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { migrateHeroImages } from '@/lib/migrate-hero-images';

export const dynamic = 'force-dynamic';

// POST - Executar migração das imagens do hero
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!canAccessAdminCatalogSession(userRole)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const result = await migrateHeroImages();

    return NextResponse.json({
      success: true,
      message: `Migração concluída: ${result.migrated} imagens atualizadas`,
      ...result,
    });
  } catch (error: any) {
    console.error('Erro ao executar migração:', error);
    return NextResponse.json(
      { error: 'Erro ao executar migração', details: error.message },
      { status: 500 }
    );
  }
}
