import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canManagePdvOrcamentos } from '@/lib/permissions';
import { getOrcamentoMongoListScope } from '@/lib/pdv-orcamento-scope';
import { createOrcamento, getOrcamentos, OrcamentoDoc } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canManagePdvOrcamentos((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const userId = String((session.user as { id?: string }).id ?? '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Nome do cliente é obrigatório' }, { status: 400 });
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Informe pelo menos um item' }, { status: 400 });
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

    const role = String((session.user as { role?: string }).role ?? '').trim();
    const pdvUserName = (session.user as { pdvUserName?: string | null }).pdvUserName ?? null;
    const id = await createOrcamento(payload, {
      createdByUserId: userId,
      createdByRole: role || 'CLIENT',
      createdByPdvUserName: pdvUserName,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao salvar orçamento:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar orçamento',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canManagePdvOrcamentos((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const userId = String((session.user as { id?: string }).id ?? '').trim();
    const role = (session.user as { role?: string }).role;
    const scope = getOrcamentoMongoListScope(role, userId || undefined);

    const result = await getOrcamentos({ search, page, limit, scope });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao listar orçamentos:', error);
    return NextResponse.json(
      {
        error: 'Erro ao listar orçamentos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

