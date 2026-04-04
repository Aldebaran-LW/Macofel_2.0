import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { reject_product } from '@/catalog-agent/tools/mongodb_tools';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !['MASTER_ADMIN', 'ADMIN'].includes((session.user?.role as string) || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { notes } = await request.json();
    const success = await reject_product(params.id, notes || 'Rejeitado pelo administrador');

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Produto rejeitado com sucesso.',
      });
    }
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
