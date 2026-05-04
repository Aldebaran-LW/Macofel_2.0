import { NextRequest, NextResponse } from 'next/server';
import { getCatalogCorsHeaders } from '@/lib/api-catalog-guard';
import { authenticatePdvWrite } from '@/lib/pdv-write-api-auth';
import { writeAuditLogDeferred } from '@/lib/audit-log';
import { createOrcamento, getOrcamentos, OrcamentoDoc } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const {
      clienteNome,
      clienteEmail,
      clienteTelefone,
      observacoes,
      itens,
      subtotal,
      freteValor,
      descontoTipo,
      descontoRaw,
      descontoValor,
      total,
    } = body ?? {};

    if (!clienteNome || !String(clienteNome).trim()) {
      return NextResponse.json(
        { error: 'Nome do cliente é obrigatório' },
        { status: 400, headers: cors }
      );
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: 'Informe pelo menos um item' },
        { status: 400, headers: cors }
      );
    }

    const payload: OrcamentoDoc = {
      clienteNome: String(clienteNome),
      clienteEmail: clienteEmail ? String(clienteEmail) : null,
      clienteTelefone: clienteTelefone ? String(clienteTelefone) : null,
      observacoes: observacoes ? String(observacoes) : null,
      itens: itens.map((it: any) => ({
        produto: String(it?.produto ?? ''),
        quantidade: Number(it?.quantidade ?? 1),
        precoUnitario: Number(it?.precoUnitario ?? 0),
        subtotal: Number(it?.subtotal ?? 0),
      })),
      subtotal: Number(subtotal ?? 0),
      freteValor: Number(freteValor ?? 0),
      descontoTipo: descontoTipo === 'percentual' ? 'percentual' : 'reais',
      descontoRaw: Number(descontoRaw ?? 0),
      descontoValor: Number(descontoValor ?? 0),
      total: Number(total ?? 0),
    };

    const id = await createOrcamento(payload);
    writeAuditLogDeferred({
      source: 'pdv',
      actorId: null,
      actorEmail: null,
      action: 'pdv.orcamento.created',
      targetType: 'orcamento_mongo',
      targetId: id,
      metadata: {
        clienteNome: payload.clienteNome,
        total: payload.total,
        itemCount: payload.itens.length,
      },
    });
    return NextResponse.json({ id }, { status: 201, headers: cors });
  } catch (error: any) {
    console.error('[PDV orcamentos] POST:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}

export async function GET(req: NextRequest) {
  const cors = getCatalogCorsHeaders(req);

  if (!process.env.PDV_API_KEY) {
    return NextResponse.json(
      { error: 'PDV_API_KEY não configurada no servidor' },
      { status: 503, headers: cors }
    );
  }
  if (!authenticatePdvWrite(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401, headers: cors });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const result = await getOrcamentos({ search, page, limit });
    return NextResponse.json(result, { headers: cors });
  } catch (error: any) {
    console.error('[PDV orcamentos] GET:', error);
    return NextResponse.json(
      {
        error: 'Erro ao listar orçamentos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}
