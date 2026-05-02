import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { Bot, InlineKeyboard, Keyboard, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import {
  getTelegramMe,
  postTelegramLink,
  formatApiError,
  getTelegramProductSearch,
  type TelegramProductSearchItem,
  postTelegramStockMove,
  getTelegramQuoteRequests,
  getTelegramQuoteById,
  getTelegramProductById,
  patchTelegramProduct,
  postTelegramProductCreate,
  patchTelegramQuoteRequest,
} from './macofel-api.js';

function dotEnvCandidatePaths(): string[] {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(scriptDir, '..', '.env'),
    path.join(scriptDir, '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
  ];
}

/** Carrega `.env` de vários sítios (pasta do bot, raiz do repo, cwd). */
function loadTelegramBotEnv(): void {
  const seen = new Set<string>();
  for (const p of dotEnvCandidatePaths()) {
    const key = path.normalize(p);
    if (seen.has(key)) continue;
    seen.add(key);
    if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
  }
}

loadTelegramBotEnv();

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
    const found = dotEnvCandidatePaths().filter((p) => fs.existsSync(p));
    console.error(`[telegram-bot] Variáveis em falta: ${missing.join(', ')}.`);
    if (found.length) {
      console.error(
        `[telegram-bot] Existem ficheiros .env (${found.join(' | ')}), mas estas chaves estão vazias ou em falta — repare em aspas e nomes exatos.`
      );
    } else {
      console.error(`[telegram-bot] Nenhum .env encontrado. Procurei em:\n  ${dotEnvCandidatePaths().join('\n  ')}`);
    }
    console.error('[telegram-bot] Veja telegram-bot/.env.example');
    process.exit(1);
  }
}

requireEnv();

startHealthServerIfPortSet();

type SessionData = {
  /** Estado conhecido pela última vez em `sendWelcome` (para escolher teclado correto em Ajuda). */
  linked?: boolean;
  /** Papel do usuário Prisma quando vinculado (ex.: mostrar links do painel /admin apenas a ADMIN). */
  userRole?: string;
  awaiting?:
    | 'code'
    | 'product_search'
    | 'stock_delta'
    | 'quote_note'
    | 'quote_id_lookup'
    | 'prod_edit_price'
    | 'prod_edit_name'
    | 'prod_create_line';
  /** Origem do fluxo após buscar produto: cadastro (painel/edição) ou só estoque. */
  productMode?: 'cadastro' | 'estoque';
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
    .text('🏠 Início')
    .row()
    .text('📎 Vincular por código')
    .text('📱 Vincular por telefone')
    .row()
    .text('❓ Ajuda')
    .text('✖️ Cancelar')
    .resized()
    .persistent();
}

function opsMenuReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text('🏠 Início')
    .row()
    .text('🛒 Produtos')
    .text('📦 Estoque')
    .row()
    .text('📋 Orçamentos')
    .text('❓ Ajuda')
    .row()
    .text('✖️ Cancelar')
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

async function dispatchCommand(ctx: BotContext, cmd: 'start'): Promise<void> {
  if (cmd === 'start') {
    ctx.session.awaiting = undefined;
    ctx.session.productMode = undefined;
    ctx.session.selectedProductId = undefined;
    ctx.session.pendingStockSign = undefined;
    ctx.session.pendingQuoteId = undefined;
    await sendWelcome(ctx);
  }
}

async function sendWelcome(ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id ?? '').trim();
  if (!telegramUserId) {
    await ctx.reply('Não consegui identificar seu usuário do Telegram. Tente novamente.');
    return;
  }

  const me = await getTelegramMe(baseUrl!, integrationKey!, telegramUserId);
  const linked = me.ok && (me.data as any)?.linked === true;

  ctx.session.linked = linked ? true : false;
  ctx.session.userRole = linked ? String((me.data as any)?.user?.role ?? '').trim() : undefined;

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
  await dispatchCommand(ctx, 'start');
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
  ctx.session.productMode = undefined;
  ctx.session.selectedProductId = undefined;
  ctx.session.pendingStockSign = undefined;
  ctx.session.pendingQuoteId = undefined;
  await ctx.reply('Teclado removido.', { reply_markup: { remove_keyboard: true } });
});

/** Mesmo comportamento que /start: volta ao menu principal e limpa fluxos temporários. */
bot.hears(
  ['🏠 Início', '🏠 Menu', 'Menu', '🔄 /start · Reinício', '/start · Reinício', '🔄 Reinício', 'Reinício'],
  async (ctx) => {
    await dispatchCommand(ctx, 'start');
  }
);

bot.hears(['❓ Ajuda', 'Ajuda'], async (ctx) => {
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
    {
      reply_markup:
        ctx.session.linked === true ? opsMenuReplyKeyboard() : mainMenuReplyKeyboard(),
    }
  );
});

bot.hears(['✖️ Cancelar', 'Cancelar'], async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.productMode = undefined;
  ctx.session.selectedProductId = undefined;
  ctx.session.pendingStockSign = undefined;
  ctx.session.pendingQuoteId = undefined;
  await ctx.reply('Ok. Toque em Início ou envie /start.', { reply_markup: { remove_keyboard: true } });
});

bot.hears(['📎 Vincular por código', 'Vincular por código'], async (ctx) => {
  ctx.session.awaiting = 'code';
  await ctx.reply(['Cole o código aqui.', 'Ex.: ABCD-12EF'].join('\n'), {
    reply_markup: mainMenuReplyKeyboard(),
  });
});

bot.hears(['📱 Vincular por telefone', 'Vincular por telefone'], async (ctx) => {
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

bot.callbackQuery('flow:prod_search', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.productMode = 'cadastro';
  ctx.session.awaiting = 'product_search';
  await ctx.reply('Digite nome, código interno ou EAN do produto:', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery('flow:prod_help', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    [
      '📖 Produtos no Telegram',
      '',
      '• Os dados são os mesmos do MongoDB do site — só muda a interface (mensagens e botões).',
      '• Equipe (não cliente) pode ver ficha completa e alterar campos conforme permissão.',
      '• “📦 Estoque” é movimentação rápida de entrada/saída.',
    ].join('\n'),
    { reply_markup: opsMenuReplyKeyboard() }
  );
});

bot.callbackQuery('flow:prod_create', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.awaiting = 'prod_create_line';
  await ctx.reply(
    [
      '➕ Cadastro rápido (gravado na mesma base do site)',
      '',
      'Envie uma linha:',
      'NOME | PREÇO | ID_DA_CATEGORIA | DESCRIÇÃO',
      '',
      'Use o caractere | entre partes. PREÇO: ex. 19,90. ID da categoria: ObjectId Mongo.',
      'Ex.: Argamassa AC3 | 42,50 | 674a1b2c3d4e5f678901234 | Saco 20kg',
    ].join('\n'),
    { reply_markup: opsMenuReplyKeyboard() }
  );
});

bot.callbackQuery(/^tg:g:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  const p = res.data as Record<string, unknown>;
  const gallery = Array.isArray(p.imageUrls) ? (p.imageUrls as string[]).slice(0, 3).join(', ') : '';
  const msg = [
    `📄 ${String(p.name ?? '')}`,
    `ID: ${String(p.id ?? productId)}`,
    `Preço: ${formatBrl(Number(p.price) || 0)} · Estoque: ${String(p.stock ?? '')}`,
    p.codigo ? `Código: ${String(p.codigo)}` : null,
    p.codBarra ? `EAN: ${String(p.codBarra)}` : null,
    `Categoria: ${String((p.category as any)?.name ?? '—')} (${String(p.categoryId ?? '')})`,
    `Ativo: ${p.status !== false ? 'sim' : 'não'}`,
    gallery ? `Imagens: ${gallery}` : null,
    '',
    String(p.description ?? '').slice(0, 1200),
  ]
    .filter(Boolean)
    .join('\n');
  await ctx.reply(msg.slice(0, 3900), {
    reply_markup: new InlineKeyboard().text('Fechar', 'cancel_inline'),
  });
});

bot.callbackQuery(/^tg:price:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_edit_price';
  await ctx.reply('Envie o novo preço (ex: 19,90):', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery(/^tg:name:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_edit_name';
  await ctx.reply('Envie o novo nome do produto:', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery(/^qr:list:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const kind = String(ctx.match?.[1] ?? '').trim();

  const titles: Record<string, string> = {
    pending: '📌 Pendentes',
    viewed: '👁 Visualizados',
    answered: '📋 Respondidos',
    archived: '📦 Arquivados',
    newqueue: '🆕 Fila nova (pendente · sem responsável · follow-up novo)',
    claimed: '👤 Com responsável',
    mine: '🙋 Minhas solicitações',
  };

  let params: {
    status?: string;
    followUpNew?: boolean;
    assignee?: 'any' | 'none' | 'me';
  } = {};

  switch (kind) {
    case 'pending':
      params = { status: 'pending' };
      break;
    case 'viewed':
      params = { status: 'viewed' };
      break;
    case 'answered':
      params = { status: 'answered' };
      break;
    case 'archived':
      params = { status: 'archived' };
      break;
    case 'newqueue':
      params = { status: 'pending', followUpNew: true, assignee: 'none' };
      break;
    case 'claimed':
      params = { status: 'all', assignee: 'any' };
      break;
    case 'mine':
      params = { status: 'all', assignee: 'me' };
      break;
    default:
      await ctx.reply('Filtro desconhecido.', { reply_markup: opsMenuReplyKeyboard() });
      return;
  }

  await sendTelegramQuoteList(ctx as BotContext, titles[kind] ?? kind, params);
});

bot.callbackQuery('qr:lookup_prompt', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.awaiting = 'quote_id_lookup';
  await ctx.reply(
    'Envie o ID da solicitação (24 caracteres, ex.: 674a…). Copie da lista ou do site.',
    { reply_markup: opsMenuReplyKeyboard() }
  );
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message?.text?.trim() ?? '';
  if (!text) return;

  // Comandos devem sempre interromper o fluxo atual (usuário espera /start, /cancelar, etc.).
  const cmdMatch = /^\/([a-z0-9_]+)/i.exec(text);
  const cmdWord = cmdMatch?.[1]?.toLowerCase();
  if (text.startsWith('/')) {
    if (cmdWord === 'start') {
      await dispatchCommand(ctx as BotContext, 'start');
      return;
    }
    if (cmdWord === 'cancelar' || cmdWord === 'cancel') {
      ctx.session.awaiting = undefined;
      ctx.session.productMode = undefined;
      ctx.session.selectedProductId = undefined;
      ctx.session.pendingStockSign = undefined;
      ctx.session.pendingQuoteId = undefined;
      await ctx.reply('Ok.', { reply_markup: { remove_keyboard: true } });
      return;
    }
  }

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

  if (ctx.session.awaiting === 'prod_edit_price') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const price = parseUserPriceBr(text);
    if (price == null) {
      await ctx.reply('Preço inválido. Ex.: 19,90', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, { price });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    await ctx.reply(`Preço gravado: ${formatBrl(price)}`, { reply_markup: opsMenuReplyKeyboard() });
    return;
  }

  if (ctx.session.awaiting === 'prod_edit_name') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply('Nome inválido.', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, { name });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    await ctx.reply('Nome atualizado na base.', { reply_markup: opsMenuReplyKeyboard() });
    return;
  }

  if (ctx.session.awaiting === 'prod_create_line') {
    ctx.session.awaiting = undefined;
    const parts = text.split('|').map((s) => s.trim());
    if (parts.length < 4) {
      await ctx.reply('Use: NOME | PREÇO | ID_CATEGORIA | DESCRIÇÃO', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const name = parts[0] ?? '';
    const priceRaw = parts[1] ?? '';
    const categoryId = parts[2] ?? '';
    const description = parts.slice(3).join('|').trim();
    const price = parseUserPriceBr(priceRaw);
    if (!name || !description || !categoryId || price == null) {
      await ctx.reply('Verifique os quatro campos (preço com vírgula ou ponto).', { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const res = await postTelegramProductCreate(baseUrl!, integrationKey!, telegramUserId, {
      name,
      description,
      categoryId,
      price,
      stock: 0,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const newId = String((res.data as any)?.id ?? '');
    await ctx.reply(`Produto criado no banco. ID: ${newId}`, { reply_markup: opsMenuReplyKeyboard() });
    return;
  }

  if (ctx.session.awaiting === 'product_search') {
    ctx.session.awaiting = undefined;
    if (!ctx.session.productMode) ctx.session.productMode = 'cadastro';
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

    const compactForCallback = (
      raw: TelegramProductSearchItem
    ): Pick<
      TelegramProductSearchItem,
      'id' | 'name' | 'codigo' | 'codBarra' | 'stock' | 'price'
    > & {
      /** URL pode ser grande; só enviamos se couber na callback_data (Telegram: 64 bytes). */
      imageUrl?: string | null;
    } => ({
      id: raw.id,
      /** Nomes longos aumentam callback_data (limite Telegram: 64 bytes). */
      name: raw.name?.slice(0, 48) ?? 'Produto',
      codigo: raw.codigo,
      codBarra: raw.codBarra,
      stock: raw.stock,
      price: raw.price,
      imageUrl: (() => {
        const u = raw.imageUrl?.trim();
        if (!u) return null;
        return u.length <= 52 ? u : null;
      })(),
    });

    const makeCallbackPayload = (
      compact: Pick<TelegramProductSearchItem, 'id' | 'name' | 'codigo' | 'codBarra' | 'stock' | 'price'> & {
        imageUrl?: string | null;
      }
    ): string => {
      const enc = encodeURIComponent(JSON.stringify(compact));
      if (Buffer.byteLength(`p_${enc}`, 'utf8') <= 64) return enc;
      const fallback = encodeURIComponent(JSON.stringify({ id: compact.id, name: compact.name }));
      return fallback;
    };

    const kb = new InlineKeyboard();
    for (const it of items.slice(0, 10)) {
      const id = String(it?.id ?? '').trim();
      const name = String(it?.name ?? 'Produto').slice(0, 40);
      if (!id) continue;
      const compact = compactForCallback(it as TelegramProductSearchItem);
      const payload = makeCallbackPayload(compact);
      kb.text(name, `p_${payload}`).row();
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
    return;
  }

  if (ctx.session.awaiting === 'quote_id_lookup') {
    ctx.session.awaiting = undefined;
    const id = text.trim();
    if (!/^[a-f\d]{24}$/i.test(id)) {
      await ctx.reply('ID inválido. Use os 24 caracteres hex da solicitação.', {
        reply_markup: opsMenuReplyKeyboard(),
      });
      return;
    }
    const res = await getTelegramQuoteById(baseUrl!, integrationKey!, telegramUserId, id);
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
      return;
    }
    const q = res.data as Record<string, unknown>;
    const items = Array.isArray(q.items) ? q.items : [];
    const itemsLines =
      items.length > 0
        ? items
            .slice(0, 8)
            .map((it: unknown, i: number) => {
              const row = it as Record<string, unknown>;
              return `${i + 1}. ${String(row?.name ?? '?')} × ${String(row?.quantity ?? '?')}`;
            })
            .join('\n')
        : '—';
    const msg = [
      `📋 ${String(q.id ?? id)}`,
      `Cliente: ${String(q.userName ?? '')} (${String(q.userEmail ?? '')})`,
      `Estado site: ${quoteStatusPt(String(q.status ?? ''))}`,
      `Follow-up: ${String(q.followUpStatus ?? 'new')}`,
      q.assignedToName ? `Responsável: ${String(q.assignedToName)}` : 'Responsável: —',
      q.message ? `Mensagem: ${String(q.message).slice(0, 400)}` : null,
      '',
      'Itens:',
      itemsLines,
      q.followUpNotes ? `\nNotas internas: ${String(q.followUpNotes).slice(0, 600)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await ctx.reply(msg.slice(0, 3900), {
      reply_markup: quoteInlineActions(String(q.id ?? id)),
    });
    return;
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

bot.hears(['🛒 Produtos', 'Produtos'], async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.productMode = 'cadastro';

  const kb = new InlineKeyboard()
    .text('🔎 Pesquisar / alterar', 'flow:prod_search')
    .text('➕ Cadastro rápido', 'flow:prod_create')
    .row()
    .text('📖 Resumo', 'flow:prod_help')
    .text('🏠 Início', 'goto_menu');

  const lines = [
    '🛒 Produtos — dados vêm do mesmo banco do site; aqui o formato é o do Telegram.',
    '',
    '• Pesquisar / alterar: localiza o produto e altera preço, nome, estoque, etc. (conforme seu papel).',
    '• Cadastro rápido: cria produto novo por mensagem (uma linha com separadores).',
  ];

  await ctx.reply(lines.join('\n'), { reply_markup: kb });
});

bot.hears(['📦 Estoque', 'Estoque'], async (ctx) => {
  ctx.session.awaiting = 'product_search';
  ctx.session.productMode = 'estoque';
  await ctx.reply(
    [
      '📦 Estoque — entrada (+) ou saída (-).',
      '',
      'Digite nome do produto, código interno ou EAN para localizar.',
    ].join('\n'),
    { reply_markup: opsMenuReplyKeyboard() }
  );
});

bot.hears(['📋 Orçamentos', 'Orçamentos'], async (ctx) => {
  if (!canManageQuotesRole(ctx.session.userRole)) {
    await ctx.reply(
      [
        '📋 Solicitações de orçamento neste Telegram só para perfis do painel (ADMIN, MASTER, gerente ou vendedor da loja).',
        '',
        'Sua conta vinculada não tem essa permissão — use o site ou peça um vínculo adequado.',
      ].join('\n'),
      { reply_markup: opsMenuReplyKeyboard() }
    );
    return;
  }

  const kb = new InlineKeyboard()
    .text('📌 Pendentes', 'qr:list:pending')
    .text('👁 Visualizados', 'qr:list:viewed')
    .row()
    .text('📋 Respondidos', 'qr:list:answered')
    .text('📦 Arquivados', 'qr:list:archived')
    .row()
    .text('🆕 Fila nova', 'qr:list:newqueue')
    .text('👤 Com responsável', 'qr:list:claimed')
    .row()
    .text('🙋 Minhas', 'qr:list:mine')
    .row()
    .text('🔎 Buscar por ID', 'qr:lookup_prompt')
    .text('🏠 Início', 'goto_menu');

  await ctx.reply(
    [
      '📋 Solicitações de orçamento (mesmos estados do site).',
      '',
      'Pendente / Visualizado / Respondido / Arquivado — como no Admin.',
      '“Fila nova”: pendente, sem responsável e follow-up ainda novo.',
      'Depois de listar, use Detalhe / Assumir / Contato / Nota / Liberar como no painel.',
    ].join('\n'),
    { reply_markup: kb }
  );
});

bot.callbackQuery('cancel_inline', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {});
});

function decodeProductCallbackToken(encoded: string): {
  id: string;
  name: string;
  codigo: string | null;
  codBarra: string | null;
  stock: number;
  price: number;
  imageUrl: string | null;
} | null {
  const raw = decodeURIComponent(encoded);
  try {
    const parsed = JSON.parse(raw) as any;
    const id = String(parsed?.id ?? '').trim();
    if (!id) return null;
    return {
      id,
      name: String(parsed?.name ?? 'Produto'),
      codigo: parsed?.codigo != null ? String(parsed.codigo) : null,
      codBarra: parsed?.codBarra != null ? String(parsed.codBarra) : null,
      stock:
        typeof parsed?.stock === 'number'
          ? Math.trunc(parsed.stock)
          : Number.isFinite(Number(parsed?.stock))
            ? Math.trunc(Number(parsed.stock))
            : 0,
      price: typeof parsed?.price === 'number' ? parsed.price : Number(parsed?.price) || 0,
      imageUrl: parsed?.imageUrl != null ? String(parsed.imageUrl) : null,
    };
  } catch {
    return null;
  }
}

function formatBrl(price: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  } catch {
    return `R$ ${price.toFixed(2)}`;
  }
}

/** Preço colado pelo utilizador (pt-BR). */
function parseUserPriceBr(text: string): number | null {
  const s = text.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (!s) return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isStaffNotClient(role: string | undefined): boolean {
  return !!role?.trim() && role !== 'CLIENT';
}

function canManageQuotesRole(role: string | undefined): boolean {
  const r = (role ?? '').trim();
  return r === 'ADMIN' || r === 'MASTER_ADMIN' || r === 'STORE_MANAGER' || r === 'SELLER';
}

const QUOTE_STATUS_PT: Record<string, string> = {
  pending: 'Pendente',
  viewed: 'Visualizado',
  answered: 'Respondido',
  archived: 'Arquivado',
};

function quoteStatusPt(status: string): string {
  return QUOTE_STATUS_PT[status] ?? status;
}

function quoteInlineActions(id: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('👁 Detalhe', `q:detail:${id}`)
    .text('Assumir', `q:claim:${id}`)
    .row()
    .text('Contato', `q:contact:${id}`)
    .text('Nota', `q:note:${id}`)
    .row()
    .text('Liberar', `q:release:${id}`);
}

async function sendTelegramQuoteList(
  ctx: BotContext,
  title: string,
  listParams: {
    status?: string;
    followUpNew?: boolean;
    assignee?: 'any' | 'none' | 'me';
  }
) {
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramQuoteRequests(baseUrl!, integrationKey!, telegramUserId, {
    page: 1,
    limit: 8,
    ...listParams,
  });
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  const list = (res.data as any)?.solicitacoes;
  const pag = (res.data as any)?.pagination;
  if (!Array.isArray(list) || list.length === 0) {
    await ctx.reply(`${title}\n\nNada encontrado com este filtro.`, { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  const total = typeof pag?.total === 'number' ? pag.total : list.length;
  const extra =
    total > list.length ? `\n…mostrando ${Math.min(5, list.length)} de ${total}.` : '';
  await ctx.reply(`${title}${extra}`, { reply_markup: opsMenuReplyKeyboard() });
  for (const raw of list.slice(0, 5)) {
    const row = raw as Record<string, unknown>;
    const id = String(row?.id ?? '');
    const msg = [
      `📋 ${id}`,
      `Cliente: ${String(row?.userName ?? '—').slice(0, 50)}`,
      `Estado site: ${quoteStatusPt(String(row?.status ?? ''))}`,
      `Follow-up: ${String(row?.followUpStatus ?? 'new')}`,
      row?.assignedToName ? `Responsável: ${String(row.assignedToName)}` : 'Responsável: —',
    ].join('\n');
    await ctx.reply(msg, { reply_markup: quoteInlineActions(id) });
  }
}

bot.callbackQuery(/^p_(.+)$/is, async (ctx) => {
  await ctx.answerCallbackQuery();
  const token = String(ctx.match?.[1] ?? '').trim();
  const product = decodeProductCallbackToken(token);
  if (!product?.id) return;
  const productId = product.id;
  ctx.session.selectedProductId = productId;

  const mode = ctx.session.productMode ?? 'cadastro';
  const staff = isStaffNotClient(ctx.session.userRole);

  const lines = [
    `✅ ${product.name}`,
    '',
    product.codigo ? `Código: ${product.codigo}` : null,
    product.codBarra ? `EAN/cód. barras: ${product.codBarra}` : null,
    `Em estoque: ${product.stock}`,
    `Preço: ${formatBrl(product.price)}`,
    `ID: ${productId}`,
  ].filter(Boolean) as string[];

  if (mode === 'estoque') {
    lines.push('', 'Fluxo Estoque: envie a quantidade depois de tocar Entrada ou Saída.');
    const kb = new InlineKeyboard()
      .text('➕ Entrada (+)', `s:in:${productId}`)
      .text('➖ Saída (-)', `s:out:${productId}`)
      .row()
      .text('🔎 Nova busca', 'search_again')
      .text('🏠 Início', 'goto_menu')
      .row()
      .text('Fechar', 'cancel_inline');
    await ctx.reply(lines.join('\n'), { reply_markup: kb });
    return;
  }

  if (staff) {
    lines.push(
      '',
      'Alterações gravam na mesma base do site (conforme sua permissão).',
      'Use os botões abaixo — interface Telegram, sem abrir o painel web.'
    );
  } else {
    lines.push('', 'Perfil cliente: consulta rápida e estoque aqui; cadastro completo continua no site.');
  }

  let kb = new InlineKeyboard()
    .text('➕ Entrada (+)', `s:in:${productId}`)
    .text('➖ Saída (-)', `s:out:${productId}`)
    .row();

  if (staff) {
    kb = kb
      .text('📄 Ficha completa', `tg:g:${productId}`)
      .row()
      .text('✏️ Alterar preço', `tg:price:${productId}`)
      .text('✏️ Alterar nome', `tg:name:${productId}`)
      .row();
  }

  kb = kb
    .text('🔎 Nova busca', 'search_again')
    .text('🏠 Início', 'goto_menu')
    .row()
    .text('Fechar', 'cancel_inline');

  await ctx.reply(lines.join('\n'), { reply_markup: kb });
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

bot.callbackQuery(/^q:detail:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = String(ctx.match?.[1] ?? '').trim();
  if (!id) return;
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramQuoteById(baseUrl!, integrationKey!, telegramUserId, id);
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard() });
    return;
  }
  const q = res.data as Record<string, unknown>;
  const items = Array.isArray(q.items) ? q.items : [];
  const itemsLines =
    items.length > 0
      ? items
          .slice(0, 8)
          .map((it: unknown, i: number) => {
            const row = it as Record<string, unknown>;
            return `${i + 1}. ${String(row?.name ?? '?')} × ${String(row?.quantity ?? '?')}`;
          })
          .join('\n')
      : '—';
  const msg = [
    `📋 ${String(q.id ?? id)}`,
    `Cliente: ${String(q.userName ?? '')} (${String(q.userEmail ?? '')})`,
    `Estado site: ${quoteStatusPt(String(q.status ?? ''))}`,
    `Follow-up: ${String(q.followUpStatus ?? 'new')}`,
    q.assignedToName ? `Responsável: ${String(q.assignedToName)}` : 'Responsável: —',
    q.message ? `Mensagem: ${String(q.message).slice(0, 400)}` : null,
    '',
    'Itens:',
    itemsLines,
    q.followUpNotes ? `\nNotas internas: ${String(q.followUpNotes).slice(0, 600)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  await ctx.reply(msg.slice(0, 3900), { reply_markup: quoteInlineActions(String(q.id ?? id)) });
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

bot.callbackQuery('search_again', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.awaiting = 'product_search';
  if (!ctx.session.productMode) ctx.session.productMode = 'cadastro';
  await ctx.reply('Digite nome, código ou EAN do produto:', { reply_markup: opsMenuReplyKeyboard() });
});

bot.callbackQuery('goto_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await dispatchCommand(ctx as BotContext, 'start');
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
