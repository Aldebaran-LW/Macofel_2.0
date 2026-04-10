import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import { generateTelegramLinkCode, hashTelegramLinkCode } from '@/lib/telegram-link-code';

export const dynamic = 'force-dynamic';

/**
 * Gera código temporário para o usuário logado vincular no bot.
 * Requer sessão (admin/operacional), porque isso serve como “login” no Telegram.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session?.user || !userId || !isAdminDashboardRole(role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const code = generateTelegramLinkCode();
  const codeHash = hashTelegramLinkCode(code);

  const ttlMinutes = Math.max(
    3,
    Math.min(60, Number(process.env.TELEGRAM_LINK_CODE_TTL_MINUTES ?? 10))
  );
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  // Limpa códigos antigos do mesmo usuário (evita poluição).
  await prisma.telegramLinkCode.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });

  await prisma.telegramLinkCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
    },
  });

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    ttlMinutes,
  });
}

