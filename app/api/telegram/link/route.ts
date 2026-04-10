import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateTelegramIntegration } from '@/lib/telegram-integration-auth';
import { normalizePhoneE164 } from '@/lib/phone-e164';
import { hashTelegramLinkCode } from '@/lib/telegram-link-code';

export const dynamic = 'force-dynamic';

type LinkMode = 'code' | 'phone';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

/**
 * Endpoint consumido pelo serviço do bot (NÃO pelo navegador).
 * Autenticação: header `X-Telegram-Key` (ou Bearer) com `TELEGRAM_INTEGRATION_KEY`.
 *
 * Modos:
 * - { mode: "code", code, telegramUserId, telegramChatId?, telegramUsername? }
 * - { mode: "phone", phone, telegramUserId, telegramChatId?, telegramUsername? }
 */
export async function POST(req: NextRequest) {
  if (!process.env.TELEGRAM_INTEGRATION_KEY) {
    return NextResponse.json(
      { error: 'TELEGRAM_INTEGRATION_KEY não configurada' },
      { status: 503 }
    );
  }
  if (!authenticateTelegramIntegration(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const mode = String(body?.mode ?? '').trim() as LinkMode;
  const telegramUserId = String(body?.telegramUserId ?? '').trim();
  const telegramChatId =
    body?.telegramChatId != null ? String(body.telegramChatId).trim() : null;
  const telegramUsername =
    typeof body?.telegramUsername === 'string' ? body.telegramUsername.trim() : null;

  if (!telegramUserId) return badRequest('telegramUserId é obrigatório');
  if (mode !== 'code' && mode !== 'phone') return badRequest('mode inválido');

  if (mode === 'code') {
    const code = String(body?.code ?? '').trim();
    if (!code) return badRequest('code é obrigatório');

    const codeHash = hashTelegramLinkCode(code);
    const now = new Date();

    const linkCode = await prisma.telegramLinkCode.findUnique({
      where: { codeHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!linkCode) return NextResponse.json({ error: 'Código inválido' }, { status: 404 });
    if (linkCode.usedAt) return NextResponse.json({ error: 'Código já utilizado' }, { status: 409 });
    if (linkCode.expiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 410 });
    }

    // Upsert do vínculo (um TelegramUserId só pode estar vinculado a um userId).
    await prisma.telegramAccount.upsert({
      where: { telegramUserId },
      update: {
        userId: linkCode.userId,
        telegramChatId,
        telegramUsername,
      },
      create: {
        userId: linkCode.userId,
        telegramUserId,
        telegramChatId,
        telegramUsername,
      },
    });

    await prisma.telegramLinkCode.update({
      where: { id: linkCode.id },
      data: {
        usedAt: now,
        usedByTelegramUserId: telegramUserId,
      },
    });

    return NextResponse.json({ success: true, mode: 'code' });
  }

  // mode === 'phone'
  const phoneRaw = String(body?.phone ?? '').trim();
  if (!phoneRaw) return badRequest('phone é obrigatório');
  const phoneE164 = normalizePhoneE164(phoneRaw);
  if (!phoneE164) return badRequest('Telefone inválido (não consegui normalizar)');

  // Procura por usuário com phone compatível.
  // Ideal: armazenar phone sempre em E.164. Aqui tentamos casar com valor já salvo.
  const candidates = await prisma.user.findMany({
    where: {
      OR: [{ phone: phoneE164 }, { phone: phoneRaw }],
    },
    select: { id: true, email: true, role: true, phone: true },
    take: 3,
  });

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'Telefone não encontrado no cadastro' },
      { status: 404 }
    );
  }
  if (candidates.length > 1) {
    return NextResponse.json(
      { error: 'Telefone duplicado em mais de um usuário (corrija no cadastro)' },
      { status: 409 }
    );
  }

  const user = candidates[0];

  await prisma.telegramAccount.upsert({
    where: { telegramUserId },
    update: {
      userId: user.id,
      telegramChatId,
      telegramUsername,
      phoneE164,
    },
    create: {
      userId: user.id,
      telegramUserId,
      telegramChatId,
      telegramUsername,
      phoneE164,
    },
  });

  return NextResponse.json({ success: true, mode: 'phone' });
}

