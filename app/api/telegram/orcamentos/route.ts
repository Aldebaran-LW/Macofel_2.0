import { NextRequest, NextResponse } from 'next/server';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { canManagePdvOrcamentos } from '@/lib/permissions';
import { getOrcamentoMongoListScope } from '@/lib/pdv-orcamento-scope';
import { writeAuditLogDeferred } from '@/lib/audit-log';
import { createOrcamento } from '@/lib/mongodb-native';
import type { OrcamentoItemDoc } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

type BodyItem = { produto?: string; quantidade?: number; precoUnitario?: number };

export async function POST(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!canManagePdvOrcamentos(linked.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const clienteNome = String((body as any).clienteNome ?? '').trim();
    if (!clienteNome) {
      return NextResponse.json({ error: 'clienteNome é obrigatório' }, { status: 400 });
    }

    const rawItems = Array.isArray((body as any).itens) ? (body as any).itens : [];
    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Informe pelo menos um item (itens[]).' }, { status: 400 });
    }

    const itens: OrcamentoItemDoc[] = [];
    for (const row of rawItems as BodyItem[]) {
      const produto = String(row?.produto ?? '').trim();
      const quantidade = Math.max(1, Math.trunc(Number(row?.quantidade) || 0));
      const precoUnitario = Number(row?.precoUnitario);
      if (!produto || !Number.isFinite(precoUnitario) || precoUnitario < 0) {
        return NextResponse.json(
          { error: 'Cada item precisa de produto (texto), quantidade e precoUnitario válidos.' },
          { status: 400 }
        );
      }
      const subtotal = quantidade * precoUnitario;
      itens.push({ produto, quantidade, precoUnitario, subtotal });
    }

    const subtotal = itens.reduce((s, it) => s + it.subtotal, 0);
    const freteValor = 0;
    const descontoTipo = 'reais' as const;
    const descontoRaw = 0;
    const descontoValor = 0;
    const total = subtotal;

    const doc = {
      clienteNome,
      clienteEmail:
        (body as any).clienteEmail != null && String((body as any).clienteEmail).trim() !== ''
          ? String((body as any).clienteEmail).trim()
          : null,
      clienteTelefone:
        (body as any).clienteTelefone != null && String((body as any).clienteTelefone).trim() !== ''
          ? String((body as any).clienteTelefone).trim()
          : null,
      observacoes:
        (body as any).observacoes != null && String((body as any).observacoes).trim() !== ''
          ? String((body as any).observacoes).trim()
          : null,
      itens,
      subtotal,
      freteValor,
      descontoTipo,
      descontoRaw,
      descontoValor,
      total,
    };

    const id = await createOrcamento(doc, {
      createdByUserId: linked.user.userId,
      createdByRole: linked.user.role,
      createdByPdvUserName: linked.user.pdvUserName,
    });
    writeAuditLogDeferred({
      source: 'telegram',
      actorId: linked.user.userId,
      actorEmail: linked.user.email,
      action: 'telegram.orcamento.created',
      targetType: 'orcamento_mongo',
      targetId: id,
      metadata: {
        clienteNome: doc.clienteNome,
        total: doc.total,
        itemCount: doc.itens.length,
        telegramUserId: linked.user.telegramUserId,
      },
    });
    return NextResponse.json({ id, ok: true });
  } catch (error: unknown) {
    console.error('[api/telegram/orcamentos POST]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
