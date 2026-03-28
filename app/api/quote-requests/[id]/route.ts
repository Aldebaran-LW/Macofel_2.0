import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/get-authenticated-user-id';
import {
  getQuoteRequestById,
  updateQuoteRequestStatus,
  saveQuoteRequestProposalDraft,
  sendQuoteRequestProposalToClient,
  setQuoteRequestClientDecision,
  sanitizeQuoteRequestForClient,
  type QuoteRequestStatus,
} from '@/lib/mongodb-native';
import {
  notifyClientProposalSent,
  notifyAdminsProposalAccepted,
  notifyAdminsProposalRejected,
} from '@/lib/email-notifications';
import { createOrderFromAcceptedQuote } from '@/lib/create-order-from-accepted-quote';
import { canManageQuotesAndOrcamentos } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const ALLOWED: QuoteRequestStatus[] = ['pending', 'viewed', 'answered', 'archived'];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUserFromRequest(_req);
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const doc = await getQuoteRequestById(id);
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const role = auth.role;
    const userId = auth.userId;
    if (canManageQuotesAndOrcamentos(role)) {
      return NextResponse.json(doc);
    }
    if (role === 'CLIENT' && doc.userId === userId) {
      return NextResponse.json(sanitizeQuoteRequestForClient(doc));
    }

    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  } catch (e: any) {
    console.error('quote-requests GET id:', e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const body = await req.json();

    if (auth.role === 'CLIENT') {
      const decision = body?.clientDecision;
      if (decision !== 'accepted' && decision !== 'rejected') {
        return NextResponse.json({ error: 'Decisão inválida' }, { status: 400 });
      }
      const r = await setQuoteRequestClientDecision(id, auth.userId, decision);
      if (!r.ok) {
        if (r.error === 'Não encontrado') {
          return NextResponse.json({ error: r.error }, { status: 404 });
        }
        if (r.error === 'Sem permissão') {
          return NextResponse.json({ error: r.error }, { status: 403 });
        }
        return NextResponse.json({ error: r.error }, { status: 400 });
      }

      const after = await getQuoteRequestById(id);
      if (after) {
        if (decision === 'accepted') {
          notifyAdminsProposalAccepted({
            quoteId: id,
            clientName: after.userName,
            clientEmail: after.userEmail,
          });
          const orderRes = await createOrderFromAcceptedQuote(id, after);
          if (!orderRes.ok && !orderRes.skipped) {
            console.error('[quote-requests] Pedido a partir do orçamento:', orderRes.error);
          }
        } else {
          notifyAdminsProposalRejected({
            quoteId: id,
            clientName: after.userName,
            clientEmail: after.userEmail,
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (!canManageQuotesAndOrcamentos(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (body?.sendProposalToClient === true && body?.proposal) {
      const ok = await sendQuoteRequestProposalToClient(id, body.proposal);
      if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      const sent = await getQuoteRequestById(id);
      if (sent?.userEmail) {
        notifyClientProposalSent({
          quoteId: id,
          toEmail: sent.userEmail,
          clientName: sent.userName || sent.userEmail,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (body?.saveProposalDraft === true && body?.proposal) {
      const ok = await saveQuoteRequestProposalDraft(id, body.proposal);
      if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const status = body?.status as QuoteRequestStatus;
    if (status && ALLOWED.includes(status)) {
      const ok = await updateQuoteRequestStatus(id, status);
      if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Informe status, saveProposalDraft ou sendProposalToClient' },
      { status: 400 }
    );
  } catch (e: any) {
    console.error('quote-requests PATCH:', e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
