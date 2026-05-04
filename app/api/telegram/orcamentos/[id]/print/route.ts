import { NextRequest, NextResponse } from 'next/server';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { canManagePdvOrcamentos } from '@/lib/permissions';
import { getOrcamentoMongoListScope } from '@/lib/pdv-orcamento-scope';
import { getOrcamentoById } from '@/lib/mongodb-native';
import { buildOrcamentoPrintHtml } from '@/lib/orcamento-print-html';

export const dynamic = 'force-dynamic';

/** HTML para imprimir / “PDF” como no site (Imprimir → guardar como PDF). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const linked = await requireLinkedTelegramUser(_req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!canManagePdvOrcamentos(linked.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const id = String(params?.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const scope = getOrcamentoMongoListScope(linked.user.role, linked.user.userId);
    const o = await getOrcamentoById(id, scope);
    if (!o) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    const html = buildOrcamentoPrintHtml({
      id: o.id,
      clienteNome: o.clienteNome,
      clienteEmail: o.clienteEmail,
      clienteTelefone: o.clienteTelefone,
      observacoes: o.observacoes,
      itens: o.itens,
      subtotal: o.subtotal,
      freteValor: o.freteValor,
      descontoTipo: o.descontoTipo,
      descontoRaw: o.descontoRaw,
      descontoValor: o.descontoValor,
      total: o.total,
      createdAt: o.createdAt ?? null,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[api/telegram/orcamentos/:id/print]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
