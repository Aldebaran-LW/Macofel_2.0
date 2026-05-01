import { NextRequest, NextResponse } from 'next/server';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { canManageQuotesAndOrcamentos } from '@/lib/permissions';
import {
  appendQuoteRequestFollowUpNote,
  claimQuoteRequest,
  markQuoteRequestContacted,
  releaseQuoteRequest,
} from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }
    if (!canManageQuotesAndOrcamentos(linked.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const id = String(params?.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);

    if (body?.claim === true) {
      const r = await claimQuoteRequest({
        id,
        actorUserId: linked.user.userId,
        actorName: linked.user.name,
        force: body?.force === true,
      });
      if (r.notFound) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      if (r.alreadyClaimed) {
        return NextResponse.json(
          { error: 'Já está em atendimento por outra pessoa' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body?.release === true) {
      const r = await releaseQuoteRequest({
        id,
        actorUserId: linked.user.userId,
        force: body?.force === true,
      });
      if (r.notFound) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      if (r.forbidden) {
        return NextResponse.json(
          { error: 'Só o responsável pode liberar (ou use force)' },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body?.markContacted === true) {
      const r = await markQuoteRequestContacted({
        id,
        actorUserId: linked.user.userId,
        actorName: linked.user.name,
      });
      if (r.notFound) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (typeof body?.followUpNote === 'string') {
      const r = await appendQuoteRequestFollowUpNote({ id, note: body.followUpNote });
      if (r.notFound) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Informe claim, release, markContacted ou followUpNote' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[api/telegram/quote-requests/:id]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

