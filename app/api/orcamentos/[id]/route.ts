import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  deleteOrcamento,
  getOrcamentoById,
  OrcamentoDoc,
  updateOrcamento,
} from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

function parseOrcamentoBody(body: any): OrcamentoDoc | NextResponse {
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
    return NextResponse.json({ error: 'Nome do cliente é obrigatório' }, { status: 400 });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Informe pelo menos um item' }, { status: 400 });
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do orçamento é obrigatório' }, { status: 400 });
    }

    const orcamento = await getOrcamentoById(id);
    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(orcamento);
  } catch (error: any) {
    console.error('Erro ao buscar orçamento:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do orçamento é obrigatório' }, { status: 400 });
    }

    const body = await req.json();
    const payload = parseOrcamentoBody(body);
    if (payload instanceof NextResponse) return payload;

    const ok = await updateOrcamento(id, payload);
    if (!ok) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao atualizar orçamento:', error);
    return NextResponse.json(
      {
        error: 'Erro ao atualizar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do orçamento é obrigatório' }, { status: 400 });
    }

    const ok = await deleteOrcamento(id);
    if (!ok) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao excluir orçamento:', error);
    return NextResponse.json(
      {
        error: 'Erro ao excluir orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

