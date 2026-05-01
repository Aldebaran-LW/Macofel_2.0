import { NextRequest, NextResponse } from 'next/server';
import { requireLinkedTelegramUser } from '@/lib/telegram-api-auth';
import { canManageQuotesAndOrcamentos } from '@/lib/permissions';
import { listQuoteRequestsAdmin } from '@/lib/mongodb-native';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const linked = await requireLinkedTelegramUser(req);
    if (!linked.ok) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    if (!canManageQuotesAndOrcamentos(linked.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10) || 10));
    const status = (searchParams.get('status') ?? 'pending').trim();

    const result = await listQuoteRequestsAdmin({ page, limit, status });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[api/telegram/quote-requests]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

