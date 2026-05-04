import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateTelegramIntegration } from '@/lib/telegram-integration-auth';
import { canUseStaffTelegramBot } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Endpoint consumido pelo bot para saber se um TelegramUserId já está vinculado.
 * Auth: X-Telegram-Key (ou Bearer) = TELEGRAM_INTEGRATION_KEY
 *
 * GET /api/telegram/me?telegramUserId=123
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.TELEGRAM_INTEGRATION_KEY) {
      return NextResponse.json(
        { error: 'TELEGRAM_INTEGRATION_KEY não configurada' },
        { status: 503 }
      );
    }
    if (!authenticateTelegramIntegration(req)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const telegramUserId = String(searchParams.get('telegramUserId') ?? '').trim();
    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      select: {
        telegramUserId: true,
        telegramChatId: true,
        telegramUsername: true,
        phoneE164: true,
        user: { select: { id: true, email: true, role: true, firstName: true, lastName: true } },
      },
    });

    if (!account?.user) {
      return NextResponse.json({ linked: false });
    }

    const name = `${account.user.firstName ?? ''} ${account.user.lastName ?? ''}`.trim();
    const staffTelegramEnabled = canUseStaffTelegramBot(account.user.role);
    return NextResponse.json({
      linked: true,
      staffTelegramEnabled,
      user: {
        id: account.user.id,
        email: account.user.email,
        role: account.user.role,
        name: name || account.user.email,
      },
      telegram: {
        telegramUserId: account.telegramUserId,
        telegramChatId: account.telegramChatId,
        telegramUsername: account.telegramUsername,
        phoneE164: account.phoneE164,
      },
    });
  } catch (error: unknown) {
    console.error('[api/telegram/me]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

