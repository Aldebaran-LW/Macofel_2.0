import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Protege GET de catálogo (/api/products, /api/categories) contra uso arbitrário (curl, scrapers).
 *
 * Permite:
 * - Header Authorization: Bearer <PDV_API_KEY> ou X-API-Key (PDV desktop, integrações)
 * - Navegador no mesmo site: Sec-Fetch-Site: same-origin
 * - Origin ou Referer com hostname permitido (NEXTAUTH_URL + ALLOWED_CATALOG_API_HOSTS)
 * - Em development: localhost
 */
function suppliedKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  const bearer =
    auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const key = req.headers.get('x-api-key');
  return bearer || key?.trim() || null;
}

function parseHostname(urlLike: string | null): string | null {
  if (!urlLike) return null;
  try {
    return new URL(urlLike).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(): string[] {
  const hosts = new Set<string>();
  const nu = process.env.NEXTAUTH_URL;
  if (nu) {
    const h = parseHostname(nu.startsWith('http') ? nu : `https://${nu}`);
    if (h) hosts.add(h);
  }
  const extra = process.env.ALLOWED_CATALOG_API_HOSTS;
  if (extra) {
    for (const part of extra.split(',')) {
      const t = part.trim().toLowerCase();
      if (t) hosts.add(t);
    }
  }
  return [...hosts];
}

export function isCatalogApiRequestAllowed(req: NextRequest): boolean {
  const secret = process.env.PDV_API_KEY;
  const key = suppliedKey(req);
  if (secret && key && key === secret) return true;

  const secSite = req.headers.get('sec-fetch-site');
  if (secSite === 'same-origin') return true;

  const hosts = allowedHosts();
  const originHost = parseHostname(req.headers.get('origin'));
  const refererHost = parseHostname(req.headers.get('referer'));

  if (originHost && hosts.includes(originHost)) return true;
  if (refererHost && hosts.includes(refererHost)) return true;

  if (process.env.NODE_ENV === 'development') {
    const dev = ['localhost', '127.0.0.1'];
    if (originHost && dev.includes(originHost)) return true;
    if (refererHost && dev.includes(refererHost)) return true;
  }

  if (hosts.length === 0 && !secret) {
    // Compat: sem NEXTAUTH_URL nem chave configurada, não bloquear (ex.: CI antigo)
    return true;
  }

  return false;
}

export function catalogForbiddenResponse() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
}

/** CORS para PDV web em outro host (ex.: loja) consumir rotas /api no domínio principal */
export function getCatalogCorsHeaders(req: NextRequest): Record<string, string> {
  const raw = req.headers.get('origin');
  if (!raw) return {};
  const h = parseHostname(raw);
  if (!h || !allowedHosts().includes(h)) return {};
  return {
    'Access-Control-Allow-Origin': raw,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
    Vary: 'Origin',
  };
}
