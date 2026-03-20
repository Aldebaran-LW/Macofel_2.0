import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/get-authenticated-user-id';
import {
  getQuoteRequestById,
  updateQuoteRequestStatus,
  type QuoteRequestStatus,
} from '@/lib/mongodb-native';

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
    if (role === 'ADMIN' || (role === 'CLIENT' && doc.userId === userId)) {
      return NextResponse.json(doc);
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
    if (!auth || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const body = await req.json();
    const status = body?.status as QuoteRequestStatus;
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const ok = await updateQuoteRequestStatus(id, status);
    if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('quote-requests PATCH:', e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
