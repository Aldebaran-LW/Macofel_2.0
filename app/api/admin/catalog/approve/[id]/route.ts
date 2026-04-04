import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { promoteCatalogDraftById } from '@/lib/catalog-draft-promote';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !['MASTER_ADMIN', 'ADMIN'].includes((session.user.role as string) || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    let notes = '';
    try {
      const body = await request.json();
      if (body && typeof body.notes === 'string') notes = body.notes;
    } catch {
      /* body opcional */
    }

    const result = await promoteCatalogDraftById(params.id, notes);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: 'Produto promovido para o catálogo (formato Prisma) com sucesso.',
      });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
