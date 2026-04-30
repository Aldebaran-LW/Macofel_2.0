import 'dotenv/config';
import http from 'node:http';
import { Bot, InlineKeyboard, Keyboard, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import { postTelegramLink, formatApiError } from './macofel-api.js';

/** Render (e similares) injeta PORT — o Web Service precisa de um listener HTTP. */
function startHealthServerIfPortSet(): void {
  const raw = process.env.PORT;
  if (raw == null || String(raw).trim() === '') return;
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0) return;

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, () => {
    console.info(`[telegram-bot] HTTP health em :${port} (GET / ou /health)`);
  });
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const integrationKey = process.env.TELEGRAM_INTEGRATION_KEY?.trim();
const baseUrl = process.env.MACOFEL_BASE_URL?.trim();

function requireEnv(): void {
  const missing: string[] = [];
  if (!token) missing.push('TELEGRAM_BOT_TOKEN');
  if (!integrationKey) missing.push('TELEGRAM_INTEGRATION_KEY');
  if (!baseUrl) missing.push('MACOFEL_BASE_URL');
  if (missing.length) {
    console.error(
      `[telegram-bot] Variáveis em falta: ${missing.join(', ')}. Copie telegram-bot/.env.example para telegram-bot/.env`
    );
    process.exit(1);
  }
}

requireEnv();

startHealthServerIfPortSet();

type SessionData = {
  awaiting?: 'code';
};

type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(token!);

bot.use(
  session({
    initial(): SessionData {
      return {};
    },
  })
);

function telegramIds(ctx: { from?: { id: number; username?: string }; chat?: { id: number } }) {
  const telegramUserId = String(ctx.from?.id ?? '');
  const telegramChatId =
    ctx.chat?.id != null ? String(ctx.chat.id) : telegramUserId;
  const telegramUsername = ctx.from?.username?.trim() || null;
  return { telegramUserId, telegramChatId, telegramUsername };
}

function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Vincular por código', 'link:code')
    .text('Vincular por telefone', 'link:phone')
    .row()
    .text('Ajuda', 'help')
    .text('Cancelar', 'cancel');
}

async function sendWelcome(ctx: BotContext) {
  await ctx.reply(
    [
      'Macofel: vincular conta',
      '',
      '1) No site: gere um código (Admin → Telegram).',
      '2) Aqui: toque “Vincular por código” e cole o código.',
      '',
      'Sem código? Use “Vincular por telefone”.',
    ].join('\n'),
    { reply_markup: mainMenuKeyboard() }
  );
}

bot.command('start', async (ctx) => {
  ctx.session.awaiting = undefined;
  await sendWelcome(ctx);
});

bot.command('entrar', async (ctx) => {
  const keyboard = new Keyboard().requestContact('Partilhar o meu número').resized();
  await ctx.reply(
    'Toque no botão abaixo para partilhar o número associado à sua conta Telegram. ' +
      'O número tem de estar cadastrado no site pelo administrador.',
    { reply_markup: keyboard }
  );
});

/** /vincular ABCD-EFGH ou /vincular ABCDEFGH */
bot.command('vincular', async (ctx) => {
  const text = ctx.message?.text?.trim() ?? '';
  const arg = text.split(/\s+/).slice(1).join(' ').trim();
  if (!arg) {
    await ctx.reply('Use: /vincular CODIGO (ex.: /vincular ABCD-12EF)');
    return;
  }

  ctx.session.awaiting = undefined;
  const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);
  const { ok, status, data } = await postTelegramLink(baseUrl!, integrationKey!, {
    mode: 'code',
    code: arg,
    telegramUserId,
    telegramChatId,
    telegramUsername,
  });

  if (ok) {
    await ctx.reply('Conta vinculada com sucesso. Pode remover o teclado com /cancelar.');
    return;
  }
  await ctx.reply(formatApiError(data, status));
});

bot.command('cancelar', async (ctx) => {
  ctx.session.awaiting = undefined;
  await ctx.reply('Teclado removido.', { reply_markup: { remove_keyboard: true } });
});

bot.callbackQuery('help', async (ctx) => {
  ctx.session.awaiting = undefined;
  await ctx.answerCallbackQuery();
  await ctx.reply(
    [
      'Passo a passo:',
      '1) Site: gere o código (Admin → Telegram).',
      '2) Telegram: “Vincular por código” → cole o código.',
      '3) Pronto.',
      '',
      'Se não tiver código: “Vincular por telefone” → compartilhar número.',
    ].join('\n'),
    { reply_markup: mainMenuKeyboard() }
  );
});

bot.callbackQuery('cancel', async (ctx) => {
  ctx.session.awaiting = undefined;
  await ctx.answerCallbackQuery();
  await ctx.reply('Ok. Se quiser, toque em /start para recomeçar.', {
    reply_markup: { remove_keyboard: true },
  });
});

bot.callbackQuery('link:code', async (ctx) => {
  ctx.session.awaiting = 'code';
  await ctx.answerCallbackQuery();
  await ctx.reply(
    [
      'Cole o código aqui.',
      'Ex.: ABCD-12EF',
    ].join('\n'),
    { reply_markup: new InlineKeyboard().text('Cancelar', 'cancel') }
  );
});

bot.callbackQuery('link:phone', async (ctx) => {
  ctx.session.awaiting = undefined;
  await ctx.answerCallbackQuery();
  const keyboard = new Keyboard().requestContact('Partilhar o meu número').resized();
  await ctx.reply(
    [
      'Toque abaixo para compartilhar seu número.',
      'Ele precisa estar cadastrado no site.',
    ].join('\n'),
    { reply_markup: keyboard }
  );
});

bot.on('message:text', async (ctx) => {
  if (ctx.session.awaiting !== 'code') return;

  const code = ctx.message?.text?.trim() ?? '';
  if (!code) return;

  ctx.session.awaiting = undefined;
  const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);
  const { ok, status, data } = await postTelegramLink(baseUrl!, integrationKey!, {
    mode: 'code',
    code,
    telegramUserId,
    telegramChatId,
    telegramUsername,
  });

  if (ok) {
    await ctx.reply('Conta vinculada com sucesso.', {
      reply_markup: { remove_keyboard: true },
    });
    await ctx.reply('O que você quer fazer agora?', { reply_markup: mainMenuKeyboard() });
    return;
  }

  await ctx.reply(formatApiError(data, status), { reply_markup: mainMenuKeyboard() });
});

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message?.contact;
  if (!contact) return;
  const fromId = ctx.from?.id;
  if (contact.user_id !== fromId) {
    await ctx.reply('Por segurança, use apenas o contacto da sua própria conta.');
    return;
  }

  const phone = contact.phone_number?.trim();
  if (!phone) {
    await ctx.reply('Não recebi número de telefone. Tente novamente.');
    return;
  }

  ctx.session.awaiting = undefined;
  const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);
  const { ok, status, data } = await postTelegramLink(baseUrl!, integrationKey!, {
    mode: 'phone',
    phone,
    telegramUserId,
    telegramChatId,
    telegramUsername,
  });

  if (ok) {
    await ctx.reply('Conta vinculada pelo telefone com sucesso.', {
      reply_markup: { remove_keyboard: true },
    });
    await ctx.reply('O que você quer fazer agora?', { reply_markup: mainMenuKeyboard() });
    return;
  }
  await ctx.reply(formatApiError(data, status), {
    reply_markup: { remove_keyboard: true },
  });
});

bot.catch((err: unknown) => {
  console.error('[telegram-bot]', err);
});

console.info('[telegram-bot] A iniciar (long polling)…');
(async () => {
  // Se algum dia tiver sido configurado webhook, ele impede o long polling.
  // Remover aqui garante que o bot sempre “sobe” e recebe updates via getUpdates.
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  } catch (err) {
    console.warn('[telegram-bot] Falha ao remover webhook (seguindo):', err);
  }

  bot.start({
    onStart: (info: { username: string; id: number }) => {
      console.info(`[telegram-bot] @${info.username} (${info.id})`);
    },
  });
})();
