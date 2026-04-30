import 'dotenv/config';
import prisma from '@/lib/db';
import { generateTelegramLinkCode, hashTelegramLinkCode } from '@/lib/telegram-link-code';

function mustEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Variável obrigatória em falta: ${name}`);
  }
  return v;
}

async function main() {
  const baseUrl = (process.env.MACOFEL_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3003')
    .trim()
    .replace(/\/$/, '');
  const integrationKey = mustEnv('TELEGRAM_INTEGRATION_KEY');

  const telegramUserId = `test_${Date.now()}`;
  const telegramChatId = telegramUserId;
  const telegramUsername = 'macofel_test';

  const user = await prisma.user.findFirst({
    where: {
      // Preferir usuário com telefone cadastrado (ajuda também no modo phone, se quiser evoluir o teste).
      phone: { not: null },
    },
    select: { id: true, email: true, phone: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!user) {
    throw new Error('Nenhum usuário com telefone encontrado no banco (users.phone).');
  }

  const code = generateTelegramLinkCode();
  const codeHash = hashTelegramLinkCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60_000);

  // Limpeza defensiva (não deveria existir)
  await prisma.telegramLinkCode.deleteMany({ where: { codeHash } });
  await prisma.telegramAccount.deleteMany({ where: { telegramUserId } });

  await prisma.telegramLinkCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  const res = await fetch(`${baseUrl}/api/telegram/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
    },
    body: JSON.stringify({
      mode: 'code',
      code,
      telegramUserId,
      telegramChatId,
      telegramUsername,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Falha ao vincular (HTTP ${res.status}). Resposta: ${JSON.stringify(json)}`
    );
  }

  const linked = await prisma.telegramAccount.findUnique({
    where: { telegramUserId },
    select: { id: true, userId: true, telegramUserId: true, telegramChatId: true },
  });

  if (!linked || linked.userId !== user.id) {
    throw new Error(
      `Vínculo não persistiu corretamente. Esperado userId=${user.id}. Obtido: ${JSON.stringify(
        linked
      )}`
    );
  }

  console.info('[OK] Telegram integrado e vinculando via código.');
  console.info(`- baseUrl: ${baseUrl}`);
  console.info(`- user: ${user.email} (${user.id})`);
  console.info(`- telegramUserId: ${telegramUserId}`);

  // Limpa os artefatos do teste (mantém o banco limpo)
  await prisma.telegramAccount.deleteMany({ where: { telegramUserId } });
  await prisma.telegramLinkCode.deleteMany({ where: { codeHash } });
}

main()
  .catch((err) => {
    console.error('[FAIL]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

