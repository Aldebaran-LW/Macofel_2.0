import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { get_pending_review_products } from '@/catalog-agent/tools/mongodb_tools';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !['MASTER_ADMIN', 'ADMIN'].includes((session.user?.role as string) || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const products = await get_pending_review_products(100);
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
