import 'dotenv/config';
import http from 'node:http';
import { Bot, InlineKeyboard, Keyboard, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import {
  getTelegramMe,
  postTelegramLink,
  formatApiError,
  getTelegramProductSearch,
  postTelegramStockMove,
  getTelegramQuoteRequests,
  patchTelegramQuoteRequest,
} from './macofel-api.js';

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
  awaiting?: 'code' | 'product_search' | 'stock_delta' | 'quote_note';
  selectedProductId?: string;
  pendingStockSign?: 1 | -1;
  pendingQuoteId?: string;
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

function mainMenuReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text('Vincular por código')
    .text('Vincular por telefone')
    .row()
    .text('Ajuda')
    .text('Cancelar')
    .resized()
    .persistent();
}

function opsMenuReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text('Produtos')
    .text('Estoque')
    .row()
    .text('Orçamentos')
    .text('Ajuda')
    .row()
    .text('Cancelar')
    .resized()
    .persistent();
}

function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Vincular por código', 'link:code')
    .text('Vincular por telefone', 'link:phone')
    .row()
    .text('Ajuda', 'help')
    .text('Cancelar', 'cancel');
}

function opsMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Estoque', 'ops:stock')
    .text('Produtos', 'ops:products')
    .row()
    .text('Orçamentos', 'ops:quotes')
    .text('Vendas', 'ops:sales')
    .row()
    .text('Ajuda', 'help')
    .text('Cancelar', 'cancel');
}

async function sendWelcome(ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id ?? '').trim();
  if (!telegramUserId) {
    await ctx.reply('Não consegui identificar seu usuário do Telegram. Tente novamente.');
    return;
  }

  const me = await getTelegramMe(baseUrl!, integrationKey!, telegramUserId);
  const linked = me.ok && (me.data as any)?.linked === true;

  if (linked) {
    const name = (me.data as any)?.user?.name ?? '';
    await ctx.reply(
      [
        'Macofel: menu',
        name ? `Olá, ${name}.` : null,
        '',
        'Escolha uma opção:',
      ]
        .filter(Boolean)
        .join('\n'),
      { reply_markup: opsMenuReplyKeyboard() }
    );
    return;
  }

  await ctx.reply(
    [
      'Macofel: vincular conta',
      '',
      '1) No site: gere um código (Admin → Telegram).',
      '2) Aqui: toque “Vincular por código” e cole o código.',
      '',
      'Sem código? Use “Vincular por telefone”.',
    ].join('\n'),
    { reply_markup: mainMenuReplyKeyboard() }
  );
}

bot.command('start', async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.selectedProductId = undefined;
  ctx.session.pendingStockSign = undefined;
  ctx.session.pendingQuoteId = undefined;
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

bot.hears('Ajuda', async (ctx) => {
  ctx.session.awaiting = undefined;
  await ctx.reply(
    [
      'Passo a passo:',
      '1) Site: gere o código (Admin → Telegram).',
      '2) Telegram: “Vincular por código” → cole o código.',
      '3) Pronto.',
      '',
      'Se não tiver código: “Vincular por telefone” → compartilhar número.',
    ].join('\n'),
    { reply_markup: mainMenuReplyKeyboard() }
  );
});

bot.hears('Cancelar', async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.selectedProductId = undefined;
  ctx.session.pendingStockSign = undefined;
  ctx.session.pendingQuoteId = undefined;
  await ctx.reply('Ok. Toque em /start para recomeçar.', { reply_markup: { remove_keyboard: true } });
});

bot.hears('Vincular por código', async (ctx) => {
  ctx.session.awaiting = 'code';
  await ctx.reply(['Cole o código aqui.', 'Ex.: ABCD-12EF'].join('\n'), {
    reply_markup: mainMenuReplyKeyboard(),
  });
});

bot.hears('Vincular por telefone', async (ctx) => {
  ctx.session.awaiting = undefined;
  const keyboard = new Keyboard().requestContact('Partilhar o meu número').resized();
  await ctx.reply(
    ['Toque abaixo para compartilhar seu número.', 'Ele precisa estar cadastrado no site.'].join('\n'),
    { reply_markup: keyboard }
  );
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
  const text = ctx.message?.text?.trim() ?? '';
  if (!text) return;

  const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);

  if (ctx.session.awaiting === 'code') {
    ctx.session.awaiting = undefined;
    const { ok, status, data } = await postTelegramLink(baseUrl!, integrationKey!, {
      mode: 'code',
      code: text,
      telegramUserId,
      telegramChatId,
      telegramUsername,
    });

    if (ok) {
      await ctx.reply('Conta vinculada com sucesso.');
      await sendWelcome(ctx);
      return;
    }

    await ctx.reply(formatApiError(data, status), { reply_markup: mainMenuReplyKeyboard() });
    return;
  }

  if (ctx.session.awaiting === 'product_search') {
    ctx.session.awaiting = undefined;
    const res = await getTelegramProductSearch(baseUrl!, integrationKey!, telegramUserId, text, 10);
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const items = (res.data as any)?.items;
    if (!Array.isArray(items) || items.length === 0) {
      await ctx.reply('Nenhum produto encontrado.', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }

    const kb = new InlineKeyboard();
    for (const it of items.slice(0, 10)) {
      const id = String(it?.id ?? '').trim();
      const name = String(it?.name ?? 'Produto').slice(0, 40);
      if (!id) continue;
      kb.text(name, `p:${id}`).row();
    }
    kb.text('Fechar', 'cancel_inline');

    await ctx.reply('Selecione um produto:', { reply_markup: kb });
    return;
  }

  if (ctx.session.awaiting === 'stock_delta') {
    const qty = parseInt(text, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      await ctx.reply('Informe um número válido (ex.: 2).', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const productId = ctx.session.selectedProductId;
    const sign = ctx.session.pendingStockSign;
    if (!productId || !sign) {
      ctx.session.awaiting = undefined;
      await ctx.reply('Fluxo perdido. Volte em Estoque e selecione o produto novamente.', {
        reply_markup: opsMenuReplyKeyboard(),
      });
      return;
    }
    ctx.session.awaiting = undefined;
    const delta = Math.trunc(sign) * Math.trunc(qty);
    const res = await postTelegramStockMove(baseUrl!, integrationKey!, telegramUserId, {
      productId,
      delta,
      reason: 'Ajuste via Telegram',
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    await ctx.reply(
      `Estoque atualizado.\nAntes: ${(res.data as any)?.before ?? '?'} → Depois: ${(res.data as any)?.after ?? '?'}`,
      { reply_markup: opsMenuReplyKeyboard() }
    );
    return;
  }

  if (ctx.session.awaiting === 'quote_note') {
    const quoteId = ctx.session.pendingQuoteId;
    ctx.session.awaiting = undefined;
    ctx.session.pendingQuoteId = undefined;
    if (!quoteId) {
      await ctx.reply('Fluxo perdido. Abra Orçamentos novamente.', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const note = text.trim();
    const res = await patchTelegramQuoteRequest(baseUrl!, integrationKey!, telegramUserId, quoteId, {
      followUpNote: note,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    await ctx.reply('Nota salva.', { reply_markup: opsMenuReplyKeyboard() });
  }
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
    await sendWelcome(ctx);
    return;
  }
  await ctx.reply(formatApiError(data, status), {
    reply_markup: { remove_keyboard: true },
  });
});

bot.hears('Produtos', async (ctx) => {
  ctx.session.awaiting = 'product_search';
  await ctx.reply('Digite o nome/código/EAN do produto:', { reply_markup: opsMenuReplyKeyboard() });
});

bot.hears('Estoque', async (ctx) => {
  ctx.session.awaiting = 'product_search';
  await ctx.reply('Digite o nome/código/EAN do produto para ajustar estoque:', {
    reply_markup: opsMenuReplyKeyboard(),
  });
});

bot.hears('Orçamentos', async (ctx) => {
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramQuoteRequests(baseUrl!, integrationKey!, telegramUserId, {
    status: 'pending',
    page: 1,
    limit: 10,
  });
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  const list = (res.data as any)?.solicitacoes;
  if (!Array.isArray(list) || list.length === 0) {
    await ctx.reply('Sem solicitações pendentes.', { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  for (const q of list.slice(0, 5)) {
    const id = String(q?.id ?? '');
    const userName = String(q?.userName ?? 'Cliente').slice(0, 60);
    const kb = new InlineKeyboard()
      .text('Assumir', `q:claim:${id}`)
      .text('Contato', `q:contact:${id}`)
      .row()
      .text('Nota', `q:note:${id}`)
      .text('Liberar', `q:release:${id}`);
    await ctx.reply([`Solicitação: ${id}`, `Cliente: ${userName}`].join('\n'), { reply_markup: kb });
  }
});

bot.callbackQuery('cancel_inline', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {});
});

bot.callbackQuery(/^p:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;

  const kb = new InlineKeyboard()
    .text('Entrada (+)', `s:in:${productId}`)
    .text('Baixa (-)', `s:out:${productId}`)
    .row()
    .text('Fechar', 'cancel_inline');

  await ctx.reply(`Produto selecionado.\nID: ${productId}`, { reply_markup: kb });
});

bot.callbackQuery(/^s:(in|out):(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dir = String(ctx.match?.[1] ?? '');
  const productId = String(ctx.match?.[2] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.pendingStockSign = dir === 'in' ? 1 : -1;
  ctx.session.awaiting = 'stock_delta';
  await ctx.reply('Informe a quantidade:', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery(/^q:(claim|contact|release|note):(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const action = String(ctx.match?.[1] ?? '');
  const quoteId = String(ctx.match?.[2] ?? '').trim();
  if (!quoteId) return;
  const { telegramUserId } = telegramIds(ctx);

  if (action === 'note') {
    ctx.session.awaiting = 'quote_note';
    ctx.session.pendingQuoteId = quoteId;
    await ctx.reply('Digite a nota:', { reply_markup: opsMenuReplyKeyboard() });
    return;
  }

  const body =
    action === 'claim'
      ? { claim: true }
      : action === 'contact'
        ? { markContacted: true }
        : { release: true };

  const res = await patchTelegramQuoteRequest(baseUrl!, integrationKey!, telegramUserId, quoteId, body);
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  await ctx.reply('Ok.', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery('ops:stock', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('Estoque: em breve.\n\n(Próximo passo: Entrada / Baixa / Consultar)', {
    reply_markup: opsMenuKeyboard(),
  });
});

bot.callbackQuery('ops:products', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('Produtos: em breve.\n\n(Próximo passo: Novo / Buscar / Alterar)', {
    reply_markup: opsMenuKeyboard(),
  });
});

bot.callbackQuery('ops:quotes', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('Orçamentos: em breve.\n\n(Próximo passo: Novos / Assumir / Marcar contato)', {
    reply_markup: opsMenuKeyboard(),
  });
});

bot.callbackQuery('ops:sales', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('Vendas: em breve.\n\n(Próximo passo: Alertas e resumo)', {
    reply_markup: opsMenuKeyboard(),
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
