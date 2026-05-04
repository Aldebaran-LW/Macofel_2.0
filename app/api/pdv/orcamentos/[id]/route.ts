import { NextRequest, NextResponse } from 'next/server';
import { getCatalogCorsHeaders } from '@/lib/api-catalog-guard';
import { authenticatePdvWrite } from '@/lib/pdv-write-api-auth';
import { writeAuditLogDeferred } from '@/lib/audit-log';
import {
  deleteOrcamento,
  getOrcamentoById,
  OrcamentoDoc,
  updateOrcamento,
} from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

function parseOrcamentoBody(body: any): OrcamentoDoc | { error: string; status: number } {
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
    return { error: 'Nome do cliente é obrigatório', status: 400 };
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return { error: 'Informe pelo menos um item', status: 400 };
  }

  return {
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
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCatalogCorsHeaders(req),
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'ID do orçamento é obrigatório' },
        { status: 400, headers: cors }
      );
    }

    const orcamento = await getOrcamentoById(id);
    if (!orcamento) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404, headers: cors }
      );
    }

    return NextResponse.json(orcamento, { headers: cors });
  } catch (error: any) {
    console.error('[PDV orcamentos] GET id:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'ID do orçamento é obrigatório' },
        { status: 400, headers: cors }
      );
    }

    const body = await req.json();
    const payload = parseOrcamentoBody(body);
    if ('error' in payload) {
      return NextResponse.json(
        { error: payload.error },
        { status: payload.status, headers: cors }
      );
    }

    const ok = await updateOrcamento(id, payload);
    if (!ok) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404, headers: cors }
      );
    }

    writeAuditLogDeferred({
      source: 'pdv',
      actorId: null,
      actorEmail: null,
      action: 'pdv.orcamento.updated',
      targetType: 'orcamento_mongo',
      targetId: id,
      metadata: { total: payload.total, itemCount: payload.itens.length },
    });
    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (error: any) {
    console.error('[PDV orcamentos] PATCH:', error);
    return NextResponse.json(
      {
        error: 'Erro ao atualizar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'ID do orçamento é obrigatório' },
        { status: 400, headers: cors }
      );
    }

    const ok = await deleteOrcamento(id);
    if (!ok) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404, headers: cors }
      );
    }

    writeAuditLogDeferred({
      source: 'pdv',
      actorId: null,
      actorEmail: null,
      action: 'pdv.orcamento.deleted',
      targetType: 'orcamento_mongo',
      targetId: id,
      metadata: {},
    });
    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (error: any) {
    console.error('[PDV orcamentos] DELETE:', error);
    return NextResponse.json(
      {
        error: 'Erro ao excluir orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500, headers: cors }
    );
  }
}
