import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getCatalogCorsHeaders } from '@/lib/api-catalog-guard';

export const dynamic = 'force-dynamic';

/** Body espelha VendaCompleta do PDV (Rust) com #[serde(flatten)] na venda. */
interface PdvItem {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  desconto: number;
  ncm?: string | null;
  cfop?: string | null;
  unidade: string;
}

interface PdvSaleBody {
  id: string;
  numero?: number | null;
  data_hora: string;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string;
  valor_pago: number;
  troco: number;
  operador?: string | null;
  terminal?: number | null;
  status: string;
  nfce_id?: string | null;
  nfce_status?: string | null;
  synced?: boolean;
  created_at: string;
  itens: PdvItem[];
}

function autenticarPdv(req: NextRequest): boolean {
  const expected = process.env.PDV_API_KEY;
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  const bearer =
    auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const key = req.headers.get('x-api-key')?.trim();
  return (
    (bearer !== null && bearer === expected) ||
    (key !== null && key === expected)
  );
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

  if (!autenticarPdv(req)) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401, headers: cors }
    );
  }

  try {
    const body = (await req.json()) as PdvSaleBody;

    if (!body?.id || !Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json(
        { error: 'Dados da venda inválidos' },
        { status: 400, headers: cors }
      );
    }

    const db = await connectToDatabase();
    const sales = db.collection('pdv_sales');

    await sales.insertOne({
      pdvVendaId: body.id,
      numero: body.numero ?? null,
      dataHora: body.data_hora,
      total: body.total,
      formaPagamento: body.forma_pagamento,
      operador: body.operador ?? null,
      terminal: body.terminal ?? null,
      status: body.status,
      itens: body.itens,
      receivedAt: new Date(),
    });

    const products = db.collection('products');
    for (const item of body.itens) {
      try {
        const oid = new ObjectId(item.produto_id);
        const q = Math.abs(Number(item.quantidade)) || 0;
        if (q <= 0) continue;
        await products.updateOne(
          { _id: oid },
          { $inc: { stock: -q } }
        );
      } catch (e) {
        console.warn('[PDV] Estoque não atualizado para', item.produto_id, e);
      }
    }

    console.log(`[PDV] Venda #${body.numero ?? '?'} recebida — R$ ${body.total}`);

    return NextResponse.json(
      {
        success: true,
        message: `Venda #${body.numero ?? ''} registrada`,
        pdv_id: body.id,
      },
      { headers: cors }
    );
  } catch (e) {
    console.error('[PDV] Erro ao processar venda:', e);
    return NextResponse.json(
      { error: 'Erro interno ao processar venda' },
      { status: 500, headers: cors }
    );
  }
}

export async function GET(req: NextRequest) {
  const cors = getCatalogCorsHeaders(req);

  if (!process.env.PDV_API_KEY) {
    return NextResponse.json(
      { error: 'PDV_API_KEY não configurada' },
      { status: 503, headers: cors }
    );
  }

  if (!autenticarPdv(req)) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401, headers: cors }
    );
  }

  try {
    const db = await connectToDatabase();
    const list = await db
      .collection('pdv_sales')
      .find({})
      .sort({ receivedAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(
      {
        total: list.length,
        vendas: list.map((d) => ({
          pdvVendaId: d.pdvVendaId,
          numero: d.numero,
          total: d.total,
          receivedAt: d.receivedAt,
        })),
      },
      { headers: cors }
    );
  } catch (e) {
    console.error('[PDV] Erro ao listar vendas:', e);
    return NextResponse.json(
      { error: 'Erro ao listar' },
      { status: 500, headers: cors }
    );
  }
}
