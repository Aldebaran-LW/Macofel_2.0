import { NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import { getBuscarProdutoInfo } from '@/lib/buscar-produto-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Parâmetro "q" é obrigatório' }, { status: 400 });
  }

  const finalResult = await getBuscarProdutoInfo(query);

  if (!finalResult) {
    return NextResponse.json(
      { error: 'Não foi possível encontrar informações sobre este produto' },
      { status: 404 }
    );
  }

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload: finalResult });
  return NextResponse.json(finalResult);
}
