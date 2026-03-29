import { NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import { getBuscarProdutoInfo, getBuscarProdutoInfoByBarcode } from '@/lib/buscar-produto-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const ean = searchParams.get('ean')?.trim();
  const nameHint = searchParams.get('nameHint')?.trim() || undefined;
  const query = searchParams.get('q')?.trim();

  if (ean) {
    const byEan = await getBuscarProdutoInfoByBarcode(ean, nameHint);
    if (!byEan) {
      return NextResponse.json(
        { error: 'Nenhuma fonte validou este EAN (Mercado Livre / Google)' },
        { status: 404 }
      );
    }
    return NextResponse.json(byEan);
  }

  if (!query) {
    return NextResponse.json(
      { error: 'Use "q" (nome) ou "ean" (código de barras)' },
      { status: 400 }
    );
  }

  const finalResult = await getBuscarProdutoInfo(query);

  if (!finalResult) {
    return NextResponse.json(
      { error: 'Não foi possível encontrar informações sobre este produto' },
      { status: 404 }
    );
  }

  return NextResponse.json(finalResult);
}
