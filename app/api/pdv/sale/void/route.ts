import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getCatalogCorsHeaders } from '@/lib/api-catalog-guard';
import { authenticatePdvWrite } from '@/lib/pdv-write-api-auth';

export const dynamic = 'force-dynamic';

interface PdvItem {
  produto_id: string;
  quantidade: number;
}

interface VoidBody {
  venda_id?: string;
  motivo?: string;
  operador?: string;
  data_hora?: string;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCatalogCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const cors = getCatalogCorsHeaders(req);

  if (!process.env.PDV_API_KEY) {
    return NextResponse.json(
      { error: 'PDV_API_KEY não configurada no servidor' },
      { status: 503, headers: cors }
    );
  }

  if (!authenticatePdvWrite(req)) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401, headers: cors }
    );
  }

  try {
    const body = (await req.json()) as VoidBody;
    const vendaId = body.venda_id?.trim();
    if (!vendaId) {
      return NextResponse.json(
        { error: 'venda_id obrigatório' },
        { status: 400, headers: cors }
      );
    }

    const db = await connectToDatabase();
    const sales = db.collection('pdv_sales');
    const products = db.collection('products');

    const doc = await sales.findOne({ pdvVendaId: vendaId });

    if (!doc) {
      return NextResponse.json(
        {
          success: true,
          pdv_id: vendaId,
          message: 'Venda não encontrada no site — nada a estornar (idempotente).',
          noop: true,
        },
        { headers: cors }
      );
    }

    if (doc.status === 'cancelada' || doc.voidedAt) {
      return NextResponse.json(
        {
          success: true,
          pdv_id: vendaId,
          message: 'Estorno já processado anteriormente.',
          duplicate: true,
        },
        { headers: cors }
      );
    }

    const itens = (doc.itens as PdvItem[] | undefined) ?? [];
    for (const item of itens) {
      try {
        const oid = new ObjectId(item.produto_id);
        const q = Math.abs(Number(item.quantidade)) || 0;
        if (q <= 0) continue;
        await products.updateOne({ _id: oid }, { $inc: { stock: q } });
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PDV void] Stock não reposto para', item.produto_id, e);
        }
      }
    }

    await sales.updateOne(
      { pdvVendaId: vendaId },
      {
        $set: {
          status: 'cancelada',
          voidedAt: new Date(),
          voidReason: body.motivo?.trim() ?? null,
          voidOperador: body.operador ?? null,
          voidRequestAt: body.data_hora ?? null,
        },
      }
    );

    if (process.env.NODE_ENV === 'development') {
      console.info('[PDV void] Estorno aplicado', { vendaId: vendaId.slice(0, 8) });
    }

    return NextResponse.json(
      {
        success: true,
        pdv_id: vendaId,
        message: 'Estorno registado e stock reposto.',
      },
      { headers: cors }
    );
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[PDV void] Erro:', e);
    }
    return NextResponse.json(
      { error: 'Erro interno ao processar estorno' },
      { status: 500, headers: cors }
    );
  }
}
