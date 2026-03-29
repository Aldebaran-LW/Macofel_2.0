import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import {
  getRenderCatalogImportBaseUrl,
  getRenderCatalogImportSecret,
} from '@/lib/render-catalog-import-env';

export const dynamic = 'force-dynamic';

const REMOTE_TIMEOUT_MS = 15 * 60 * 1000;
/** Importação com enriquecimento Gemini (vários lotes) pode exceder o timeout normal. */
const REMOTE_TIMEOUT_ENRICH_MS = 28 * 60 * 1000;

/** Proxy seguro: o browser fala só com o Next; o Next reenvia o ficheiro ao serviço na Render com o segredo. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const base = getRenderCatalogImportBaseUrl();
    const secret = getRenderCatalogImportSecret();
    if (!base || !secret) {
      return NextResponse.json(
        { error: 'Serviço dedicado não configurado (RENDER_CATALOG_IMPORT_URL / SECRET).' },
        { status: 503 }
      );
    }

    const incoming = await req.formData();
    const file = incoming.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o ficheiro no campo file' }, { status: 400 });
    }

    const upsertRaw = incoming.get('upsert');
    const upsert = upsertRaw === 'true' || upsertRaw === '1';
    const enrichAi =
      incoming.get('enrich_ai') === 'true' || incoming.get('enrich_ai') === '1';
    const preserveRaw = incoming.get('preserve_stock_db');
    const preserveStockDb =
      preserveRaw === 'true' || preserveRaw === '1';

    const fd = new FormData();
    const fname = file instanceof File ? file.name : 'upload';
    fd.append('file', file, fname);
    fd.append('upsert', upsert ? 'true' : 'false');
    fd.append('enrich_ai', enrichAi ? 'true' : 'false');
    fd.append('preserve_stock_db', preserveStockDb ? 'true' : 'false');

    const timeoutMs = enrichAi ? REMOTE_TIMEOUT_ENRICH_MS : REMOTE_TIMEOUT_MS;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let upstream: Response;
    try {
      upstream = await fetch(`${base}/import/catalog`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
        body: fd,
        signal: ctrl.signal,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('abort')) {
        return NextResponse.json(
          { error: 'Tempo esgotado ao contactar o serviço de importação (tente ficheiro menor ou verifique a Render).' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: 'Falha ao contactar o serviço de importação', details: msg },
        { status: 502 }
      );
    } finally {
      clearTimeout(timer);
    }

    const ct = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': ct },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('import remote proxy:', e);
    return NextResponse.json({ error: 'Erro no proxy de importação', details: message }, { status: 500 });
  }
}
