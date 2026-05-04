import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { canAccessAdminCatalogSession } from '@/lib/permissions';
import { CATALOG_INTERNAL_SECRET } from '@/env';
import {
  markActiveProductsForEnrichmentAll,
  markActiveProductsForShortDescriptionEnrichment,
} from '@/lib/catalog-active-enrich-queue';

export const dynamic = 'force-dynamic';

function authorized(
  request: NextRequest,
  session: Awaited<ReturnType<typeof getServerSession>>
) {
  const u = (session as { user?: { role?: string } } | null)?.user;
  const admin = Boolean(u && canAccessAdminCatalogSession(u.role));
  const secretOk =
    Boolean(CATALOG_INTERNAL_SECRET) &&
    request.headers.get('x-catalog-secret') === CATALOG_INTERNAL_SECRET;
  return admin || secretOk;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authorized(request, session)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: 'short_description' | 'all';
      shortDescriptionMaxLen?: number;
      maxToMark?: number;
      /** false = incluir ativos sem EAN válido (legado). */
      requireValidBarcode?: boolean;
    };

    const mode = body.mode ?? 'short_description';
    const maxToMark =
      typeof body.maxToMark === 'number' && body.maxToMark > 0
        ? body.maxToMark
        : undefined;
    const requireValidBarcode = body.requireValidBarcode !== false;

    if (mode === 'all') {
      const { marked } = await markActiveProductsForEnrichmentAll({
        maxToMark,
        requireValidBarcode,
      });
      return NextResponse.json({
        ok: true,
        mode: 'all',
        marked,
        message: `${marked} produto(s) ativo(s) marcados para enriquecimento IA.`,
      });
    }

    const shortLen =
      typeof body.shortDescriptionMaxLen === 'number' && body.shortDescriptionMaxLen > 0
        ? body.shortDescriptionMaxLen
        : undefined;

    const { marked } = await markActiveProductsForShortDescriptionEnrichment({
      shortDescriptionMaxLen: shortLen,
      maxToMark,
      requireValidBarcode,
    });

    return NextResponse.json({
      ok: true,
      mode: 'short_description',
      marked,
      message: `${marked} produto(s) com descrição curta marcados para a fila de IA.`,
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
