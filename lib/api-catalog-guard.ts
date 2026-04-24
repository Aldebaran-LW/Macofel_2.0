import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Protege GET de catálogo (/api/products, /api/categories) contra uso arbitrário (curl, scrapers).
 *
 * Permite:
 * - Header Authorization: Bearer <PDV_API_KEY> ou X-API-Key (PDV desktop, integrações)
 * - Navegador no mesmo site: Sec-Fetch-Site: same-origin
 * - Origin ou Referer com hostname permitido (NEXTAUTH_URL + VERCEL_URL + ALLOWED_CATALOG_API_HOSTS)
 * - Host / X-Forwarded-Host quando coincide com a lista (útil com Sec-Fetch ou Origin em falta)
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

function hostFromRequest(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (xf) {
    const w = xf.toLowerCase().split(':')[0].trim();
    if (w) return w;
  }
  const h = req.headers.get('host')?.toLowerCase();
  if (h) {
    return h.split(':')[0]!.trim() || null;
  }
  try {
    return new URL(req.url).hostname.toLowerCase() || null;
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
  const vurl = process.env.VERCEL_URL;
  if (vurl) {
    const h = vurl
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      ?.split(':')[0]
      ?.toLowerCase()
      .trim();
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

  if (req.headers.get('sec-fetch-site')?.toLowerCase() === 'same-origin') {
    return true;
  }

  const hosts = allowedHosts();
  const requestHost = hostFromRequest(req);
  if (requestHost && hosts.length > 0 && hosts.includes(requestHost)) {
    return true;
  }

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
    Vary: 'Origin',
  };
}
