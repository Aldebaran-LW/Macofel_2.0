import type { NextRequest } from 'next/server';

/**
 * Autenticação para rotas mutáveis do PDV (`POST /api/pdv/sale`, `POST /api/pdv/sale/void`).
 * Mesma chave que integrações usam no catálogo quando enviam Bearer / X-API-Key.
 */
export function authenticatePdvWrite(req: NextRequest): boolean {
  const expected = process.env.PDV_API_KEY;
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  const bearer =
    auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const key = req.headers.get('x-api-key')?.trim();
  return (
    (bearer !== null && bearer === expected) ||
    (key !== null && key === expected)
  );
}
