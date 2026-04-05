import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { CATALOG_INTERNAL_SECRET, CRON_SECRET } from '@/env';
import { enrichActiveCatalogPendingProducts } from '@/lib/catalog-active-enrich-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(
  request: NextRequest,
  session: Awaited<ReturnType<typeof getServerSession>>
) {
  const u = (session as { user?: { role?: string } } | null)?.user;
  const admin = Boolean(u && isAdminDashboardRole(u.role));
  const secretOk =
    Boolean(CATALOG_INTERNAL_SECRET) &&
    request.headers.get('x-catalog-secret') === CATALOG_INTERNAL_SECRET;
  const bearer = request.headers.get('authorization');
  const cronOk =
    Boolean(CRON_SECRET) && bearer === `Bearer ${CRON_SECRET}`;
  return admin || secretOk || cronOk;
}

async function handle(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authorized(request, session)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    let limit: number | undefined;
    if (request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { limit?: number };
      if (typeof body.limit === 'number' && body.limit > 0) limit = body.limit;
    }

    const chain = request.method === 'POST';
    const result = await enrichActiveCatalogPendingProducts({ limit, chain });
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      chained: result.chained,
      message:
        result.processed === 0
          ? 'Nenhum produto ativo na fila (pending).'
          : `Processados ${result.processed} produto(s) neste lote.`,
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Vercel Cron invoca com GET. */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
