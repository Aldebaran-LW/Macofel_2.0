import type { NextRequest } from 'next/server';

/**
 * Autenticação para rotas internas do Telegram (consumo de código / vínculo por telefone).
 * Use uma chave de integração separada do PDV para poder rotacionar sem afetar outras integrações.
 */
export function authenticateTelegramIntegration(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_INTEGRATION_KEY;
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  const bearer =
    auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const key = req.headers.get('x-telegram-key')?.trim();
  return (
    (bearer !== null && bearer === expected) ||
    (key !== null && key === expected)
  );
}

