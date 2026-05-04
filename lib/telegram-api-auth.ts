import type { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { authenticateTelegramIntegration } from '@/lib/telegram-integration-auth';
import { canUseStaffTelegramBot } from '@/lib/permissions';

export type TelegramLinkedUser = {
  userId: string;
  email: string;
  role: string;
  name: string;
  /** Login curto PDV (mesmo campo do utilizador no site). */
  pdvUserName: string | null;
  telegramUserId: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
};

export function getTelegramUserIdFromRequest(req: NextRequest): string {
  const byHeader = req.headers.get('x-telegram-userid')?.trim();
  if (byHeader) return byHeader;
  const byQuery = new URL(req.url).searchParams.get('telegramUserId')?.trim();
  return byQuery || '';
}

export async function requireTelegramIntegrationAuth(
  req: NextRequest
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!process.env.TELEGRAM_INTEGRATION_KEY) {
    return { ok: false, status: 503, error: 'TELEGRAM_INTEGRATION_KEY não configurada' };
  }
  if (!authenticateTelegramIntegration(req)) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }
  return { ok: true };
}

export async function requireLinkedTelegramUser(
  req: NextRequest
): Promise<
  | { ok: true; user: TelegramLinkedUser }
  | { ok: false; status: number; error: string }
> {
  const auth = await requireTelegramIntegrationAuth(req);
  if (!auth.ok) return auth;

  const telegramUserId = getTelegramUserIdFromRequest(req);
  if (!telegramUserId) {
    return { ok: false, status: 400, error: 'telegramUserId é obrigatório (header x-telegram-userid ou query)' };
  }

  const account = await prisma.telegramAccount.findUnique({
    where: { telegramUserId },
    select: {
      telegramUserId: true,
      telegramChatId: true,
      telegramUsername: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          pdvUserName: true,
        },
      },
    },
  });

  if (!account?.user) {
    return { ok: false, status: 403, error: 'Telegram não vinculado a um usuário' };
  }

  if (!canUseStaffTelegramBot(account.user.role)) {
    return {
      ok: false,
      status: 403,
      error:
        'Este perfil (vendedor ou gerente de loja) não utiliza o bot Telegram. Use o painel web.',
    };
  }

  const name = `${account.user.firstName ?? ''} ${account.user.lastName ?? ''}`.trim();
  return {
    ok: true,
    user: {
      userId: account.user.id,
      email: account.user.email,
      role: account.user.role,
      name: name || account.user.email,
      pdvUserName: account.user.pdvUserName ?? null,
      telegramUserId: account.telegramUserId,
      telegramChatId: account.telegramChatId ?? null,
      telegramUsername: account.telegramUsername ?? null,
    },
  };
}

