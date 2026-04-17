import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import { getCatalogCorsHeaders } from '@/lib/api-catalog-guard';
import { getTaxDefaultPercent } from '@/lib/server-app-settings';
import { authenticatePdvWrite } from '@/lib/pdv-write-api-auth';

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
    const body = (await req.json()) as PdvSaleBody;

    if (!body?.id || !Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json(
        { error: 'Dados da venda inválidos' },
        { status: 400, headers: cors }
      );
    }

    const db = await connectToDatabase();
    const sales = db.collection('pdv_sales');
    const products = db.collection('products');
    const siteTaxDefaultPercent = await getTaxDefaultPercent();
    const movements = db.collection('inventory_movements');
    const actorLabel = body.operador?.trim() || 'PDV';
    const actorType = 'pdv_api_key';
    const actorRole = 'PDV_OPERATOR';

    const existing = await sales.findOne({ pdvVendaId: body.id });
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: 'Venda já processada',
          pdv_id: body.id,
          duplicate: true,
        },
        { headers: cors }
      );
    }

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
      receivedBy: actorLabel,
      actorType,
      actorRole,
      /** Referência à taxa configurada no site no momento da sincronização (o total vem do PDV). */
      siteTaxDefaultPercent,
    });

    const movementDocs: Array<Record<string, unknown>> = [];
    for (const item of body.itens) {
      try {
        const oid = new ObjectId(item.produto_id);
        const q = Math.abs(Number(item.quantidade)) || 0;
        if (q <= 0) continue;
        await products.updateOne(
          { _id: oid },
          { $inc: { stock: -q } }
        );
        movementDocs.push({
          productId: item.produto_id,
          productName: item.produto_nome ?? 'Produto',
          type: 'saida',
          quantity: q,
          note: `Venda PDV #${body.numero ?? ''} (${body.id})`,
          source: 'pdv_sale',
          createdAt: new Date(),
          createdBy: actorLabel,
          actorId: null,
          actorEmail: null,
          actorRole,
          actorType,
          pdvVendaId: body.id,
          pdvItemId: item.id ?? null,
        });
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PDV] Estoque não atualizado para', item.produto_id, e);
        }
      }
    }
    if (movementDocs.length > 0) {
      await movements.insertMany(movementDocs, { ordered: false });
    }

    if (process.env.NODE_ENV === 'development') {
      console.info('[PDV] Venda recebida', {
        numero: body.numero ?? null,
        pdvPrefix: body.id.slice(0, 8),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Venda #${body.numero ?? ''} registrada`,
        pdv_id: body.id,
      },
      { headers: cors }
    );
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[PDV] Erro ao processar venda:', e);
    }
    return NextResponse.json(
      { error: 'Erro interno ao processar venda' },
      { status: 500, headers: cors }
    );
  }
}

/**
 * Lista últimas vendas PDV sincronizadas. Exige a mesma PDV_API_KEY que o POST.
 *
 * Segurança: expõe metadados de vendas a quem tem a chave — tratar como endpoint
 * operacional; restringir rotação da chave e acesso (ver docs/referencias/CHECKLIST_SEGURANCA.md Fase 3).
 */
export async function GET(req: NextRequest) {
  const cors = getCatalogCorsHeaders(req);

  if (!process.env.PDV_API_KEY) {
    return NextResponse.json(
      { error: 'PDV_API_KEY não configurada' },
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
    if (process.env.NODE_ENV === 'development') {
      console.error('[PDV] Erro ao listar vendas:', e);
    }
    return NextResponse.json(
      { error: 'Erro ao listar' },
      { status: 500, headers: cors }
    );
  }
}
