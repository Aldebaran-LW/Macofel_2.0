import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/get-authenticated-user-id';
import {
  createQuoteRequest,
  listQuoteRequestsAdmin,
  listQuoteRequestsByUser,
  sanitizeQuoteRequestForClient,
  type QuoteRequestItem,
} from '@/lib/mongodb-native';
import { notifyAdminsNewQuoteRequest } from '@/lib/email-notifications';
import { canManageClientQuoteRequests } from '@/lib/permissions';
import { writeAuditLogDeferred } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const role = auth.role;
    const userId = auth.userId;

    if (canManageClientQuoteRequests(role)) {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') ?? '1', 10);
      const limit = parseInt(searchParams.get('limit') ?? '30', 10);
      const status = searchParams.get('status') ?? undefined;
      const result = await listQuoteRequestsAdmin({ page, limit, status });
      return NextResponse.json(result);
    }

    if (role === 'CLIENT') {
      const list = await listQuoteRequestsByUser(userId);
      return NextResponse.json({
        solicitacoes: list.map(sanitizeQuoteRequestForClient),
      });
    }

    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  } catch (e: any) {
    console.error('quote-requests GET:', e);
    return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Faça login para solicitar orçamento' }, { status: 401 });
    }

    if (auth.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Apenas clientes podem enviar solicitação' }, { status: 403 });
    }

    const userId = auth.userId;
    const email = auth.email;
    const name = auth.name || email;

    const body = await req.json();
    const { message, items, shippingCep, shippingCityState, requestShippingQuote, requestPixDiscount } =
      body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um item' }, { status: 400 });
    }

    const normalized: QuoteRequestItem[] = items.map((it: any) => ({
      productId: String(it?.productId ?? ''),
      name: String(it?.name ?? '').trim() || 'Produto',
      slug: it?.slug ? String(it.slug) : undefined,
      quantity: Math.max(1, parseInt(String(it?.quantity ?? 1), 10) || 1),
      price: it?.price != null ? Number(it.price) : undefined,
    }));

    for (const it of normalized) {
      if (!it.productId) {
        return NextResponse.json({ error: 'Item com produto inválido' }, { status: 400 });
      }
    }

    const cepDigits =
      shippingCep != null && String(shippingCep).trim() !== ''
        ? String(shippingCep).replace(/\D/g, '').slice(0, 8)
        : null;
    const cityState =
      shippingCityState != null && String(shippingCityState).trim() !== ''
        ? String(shippingCityState).trim().slice(0, 200)
        : null;

    const id = await createQuoteRequest({
      userId,
      userEmail: String(email),
      userName: String(name),
      message: message != null ? String(message).slice(0, 4000) : null,
      items: normalized,
      status: 'pending',
      shippingCep: cepDigits ? cepDigits : null,
      shippingCityState: cityState,
      requestShippingQuote: requestShippingQuote === true,
      requestPixDiscount: requestPixDiscount === true,
    });

    notifyAdminsNewQuoteRequest({
      quoteId: id,
      clientName: String(name),
      clientEmail: String(email),
      itemCount: normalized.length,
    });

    writeAuditLogDeferred({
      source: 'site',
      actorId: userId,
      actorEmail: String(email),
      action: 'site.quote_request.created',
      targetType: 'quote_request',
      targetId: id,
      metadata: { itemCount: normalized.length, name: String(name) },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    console.error('quote-requests POST:', e);
    return NextResponse.json({ error: 'Erro ao registrar solicitação' }, { status: 500 });
  }
}
