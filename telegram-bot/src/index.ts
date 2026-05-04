import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { Bot, InlineKeyboard, InputFile, Keyboard, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import {
  getTelegramMe,
  postTelegramLink,
  formatApiError,
  getTelegramProductSearch,
  postTelegramStockMove,
  getTelegramQuoteRequests,
  getTelegramQuoteById,
  getTelegramProductById,
  patchTelegramProduct,
  postTelegramProductCreate,
  patchTelegramQuoteRequest,
  postTelegramOrcamento,
  fetchTelegramOrcamentoPrintHtml,
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
  /** Conta no site tem Telegram ligado, mas o papel não usa o bot (vendedor / gerente de loja). */
  telegramStaffDisabled?: boolean;
  /** Papel do usuário Prisma quando vinculado (ex.: mostrar links do painel /admin apenas a ADMIN). */
  userRole?: string;
  awaiting?:
    | 'code'
    | 'product_search'
    | 'stock_delta'
    | 'quote_note'
    | 'quote_id_lookup'
    | 'prod_edit_name'
    | 'prod_create_flow'
    | 'prod_price_vista'
    | 'prod_price_prazo'
    | 'prod_desc'
    | 'prod_weight'
    | 'prod_dim'
    | 'prod_photo'
    | 'prod_photo_multi'
    | 'orc_nome'
    | 'orc_email'
    | 'orc_lines';
  /** Assistente de cadastro rápido (passo a passo). */
  prodCreate?: {
    step: 'name' | 'price' | 'category' | 'description' | 'pricePrazo' | 'images' | 'confirm';
    name?: string;
    price?: number;
    categoryId?: string;
    description?: string;
    pricePrazo?: number | null;
    imageUrls?: string[];
  };
  /** Origem do fluxo após buscar produto: cadastro (painel/edição) ou só estoque. */
  productMode?: 'cadastro' | 'estoque';
  selectedProductId?: string;
  pendingStockSign?: 1 | -1;
  pendingQuoteId?: string;
  prodDescMode?: 'append' | 'replace';
  prodPhotoMode?: 'add' | 'replace_first' | 'replace_all';
  /** Em `prod_photo_multi`: a próxima foto enviada passa a ser a capa (`imageUrl`) e a 1.ª da galeria. */
  prodPhotoNextPrimary?: boolean;
  orcClienteNome?: string;
  orcClienteEmail?: string | null;
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

/**
 * Teclado do menu operacional.
 * Perfis `EMPLOYEE` só usam o fluxo **📦 Estoque** (movimentação + orientação devoluções/trocas).
 */
function opsMenuReplyKeyboard(userRole?: string): Keyboard {
  const role = (userRole ?? '').trim();
  if (role === 'EMPLOYEE') {
    return new Keyboard()
      .text('🏠 Início')
      .row()
      .text('📦 Estoque')
      .row()
      .text('❓ Ajuda')
      .text('✖️ Cancelar')
      .resized()
      .persistent();
  }
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
    ctx.session.prodPhotoMode = undefined;
    ctx.session.prodPhotoNextPrimary = undefined;
    ctx.session.prodCreate = undefined;
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
  const staffTelegramEnabled =
    !linked || (me.data as any)?.staffTelegramEnabled !== false;

  ctx.session.telegramStaffDisabled = linked && !staffTelegramEnabled;
  ctx.session.userRole = linked ? String((me.data as any)?.user?.role ?? '').trim() : undefined;
  ctx.session.linked = linked && staffTelegramEnabled;

  if (ctx.session.telegramStaffDisabled) {
    await ctx.reply(
      [
        'A sua conta está associada ao Macofel, mas **o seu perfil (vendedor ou gerente de loja) não utiliza o bot Telegram** nesta fase.',
        '',
        'Use o **painel web** (/painel-loja) para PDV, orçamentos e operações da loja.',
        '',
        'Se precisar de ajuda, fale com um administrador.',
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return;
  }

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
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
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
  ctx.session.prodPhotoMode = undefined;
  ctx.session.prodPhotoNextPrimary = undefined;
  ctx.session.prodCreate = undefined;
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
        ctx.session.telegramStaffDisabled === true
          ? { remove_keyboard: true }
          : ctx.session.linked === true
            ? opsMenuReplyKeyboard(ctx.session.userRole)
            : mainMenuReplyKeyboard(),
    }
  );
});

bot.hears(['✖️ Cancelar', 'Cancelar'], async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.productMode = undefined;
  ctx.session.selectedProductId = undefined;
  ctx.session.pendingStockSign = undefined;
  ctx.session.pendingQuoteId = undefined;
  ctx.session.prodPhotoMode = undefined;
  ctx.session.prodPhotoNextPrimary = undefined;
  ctx.session.prodCreate = undefined;
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

/** Qualquer papel de equipa no site (não CLIENT) — alinhado a `isOperationalStaffRole` na API. */
function isStaffNotClient(role: string | undefined): boolean {
  return !!role?.trim() && role !== 'CLIENT';
}

/** Solicitações de orçamento no site — alinhado a `canManageClientQuoteRequests` na API. */
function canManageTelegramClientQuoteRequests(role: string | undefined): boolean {
  const r = (role ?? '').trim();
  return r === 'MASTER_ADMIN' || r === 'ADMIN' || r === 'GERENTE_SITE';
}

/** Perfil operacional de armazém: no Telegram só o menu Estoque (política Macofel). */
function isTelegramEmployeeStockOnly(role: string | undefined): boolean {
  return (role ?? '').trim() === 'EMPLOYEE';
}

function painelTrocasDevolucoesUrl(): string {
  return `${baseUrl!.replace(/\/$/, '')}/painel-loja/trocas-devolucoes`;
}

/** Quem pode abrir no browser a área formal de trocas/devoluções no painel da loja. */
function canOpenPainelTrocasWeb(role: string | undefined): boolean {
  const r = (role ?? '').trim();
  return (
    r === 'STORE_MANAGER' ||
    r === 'GERENTE_SITE' ||
    r === 'SELLER' ||
    r === 'ADMIN' ||
    r === 'MASTER_ADMIN'
  );
}

/** Tem de ficar ANTES de `bot.on('message:text')`, senão o handler genérico consome o update e estes nunca correm. */
bot.hears(['🛒 Produtos', 'Produtos'], async (ctx) => {
  ctx.session.awaiting = undefined;
  if (isTelegramEmployeeStockOnly(ctx.session.userRole)) {
    await ctx.reply(
      [
        '🛒 O seu perfil (**funcionário / armazém**) usa apenas o fluxo **📦 Estoque** neste bot.',
        '',
        'Toque em **📦 Estoque** no teclado: movimentação (±) ou orientação sobre **devoluções e trocas**.',
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }
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
    '• Pesquisar / alterar: localiza o produto (preço, descrição, imagens, etc.). Entrada/saída de stock é em 📦 Estoque.',
    '• Cadastro rápido: assistente pergunta cada campo e imagens; confirma no fim.',
  ];

  await ctx.reply(lines.join('\n'), { reply_markup: kb });
});

bot.hears(['📦 Estoque', 'Estoque'], async (ctx) => {
  ctx.session.awaiting = undefined;
  ctx.session.productMode = 'estoque';
  const kb = new InlineKeyboard()
    .text('📥 Movimentação (± stock)', 'flow:estoque_mov')
    .row()
    .text('↩️ Devolução e trocas', 'flow:estoque_trocas')
    .row()
    .text('🏠 Início', 'goto_menu');
  await ctx.reply(
    [
      '📦 **Estoque**',
      '',
      '• **Movimentação:** pesquisa o produto e regista entrada (+) ou saída (-).',
      '• **Devolução e trocas:** orientação e ligação ao painel da loja (quando aplicável).',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.hears(['📋 Orçamentos', 'Orçamentos'], async (ctx) => {
  if (isTelegramEmployeeStockOnly(ctx.session.userRole)) {
    await ctx.reply(
      [
        '📋 O seu perfil (**funcionário / armazém**) não usa orçamentos neste bot.',
        '',
        'Use **📦 Estoque** para movimentação e devoluções/trocas.',
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }
  if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
    await ctx.reply(
      [
        '📋 Solicitações de orçamento exigem conta de funcionário vinculada (não cliente).',
        '',
        'Sua conta não está como equipa no site — peça o cadastro correto ou use o portal.',
      ].join('\n'),
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
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
    .row()
    .text('➕ Novo orçamento', 'flow:orc_novo')
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

bot.callbackQuery('flow:estoque_mov', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.productMode = 'estoque';
  ctx.session.awaiting = 'product_search';
  await ctx.reply(
    [
      '📥 **Movimentação de stock**',
      '',
      'Digite nome do produto, código interno ou EAN para localizar.',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery('flow:estoque_trocas', async (ctx) => {
  await ctx.answerCallbackQuery();
  const role = ctx.session.userRole;
  const lines = [
    '↩️ **Devolução e trocas**',
    '',
    '• **Mercadoria que regressa ao armazém:** use **Movimentação** → pesquise o produto → **Entrada (+)** com a quantidade recebida.',
    '• **Registo formal** (política da loja, aprovações): área **Trocas e devoluções** no painel web da loja (em evolução no site).',
  ];
  if (canOpenPainelTrocasWeb(role)) {
    lines.push('', `Abrir: ${painelTrocasDevolucoesUrl()}`);
  } else {
    lines.push(
      '',
      'O seu utilizador regista aqui a **movimentação física**; pedidos formais de troca/devolução tratam com **gerente ou vendedor** da loja.'
    );
  }
  const kb = new InlineKeyboard()
    .text('📥 Ir para movimentação', 'flow:estoque_mov')
    .row()
    .text('🏠 Início', 'goto_menu');
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: kb });
});

bot.callbackQuery('flow:prod_search', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (isTelegramEmployeeStockOnly(ctx.session.userRole)) {
    await ctx.reply(
      'Perfis de armazém só usam **📦 Estoque** (movimentação e devoluções).',
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }
  ctx.session.productMode = 'cadastro';
  ctx.session.awaiting = 'product_search';
  await ctx.reply('Digite nome, código interno ou EAN do produto:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery('flow:prod_help', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    [
      '📖 Produtos no Telegram',
      '',
      '• Os dados são os mesmos do MongoDB do site — só muda a interface (mensagens e botões).',
      '• Equipe (não cliente) pode ver ficha completa e alterar preço, descrição, imagens, etc.',
      '• Entrada/saída de stock é só em “📦 Estoque”.',
    ].join('\n'),
    { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery('flow:prod_create', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (isTelegramEmployeeStockOnly(ctx.session.userRole)) {
    await ctx.reply(
      'Cadastro de produtos pelo bot não está disponível para o seu perfil. Use **📦 Estoque**.',
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }
  if (!isStaffNotClient(ctx.session.userRole)) {
    await ctx.reply('Cadastro rápido é apenas para contas de equipa (não cliente).', {
      reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
    });
    return;
  }
  ctx.session.awaiting = 'prod_create_flow';
  ctx.session.prodCreate = { step: 'name' };
  await ctx.reply(
    [
      '➕ **Cadastro rápido** (mesma base do site)',
      '',
      '1/6 — Qual o **nome** do produto?',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^tg:g:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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

bot.callbackQuery(/^ppv:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_price_vista';
  await ctx.reply('Preço à vista — envie o valor (ex.: 19,90):', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^ppp:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_price_prazo';
  await ctx.reply('Preço a prazo — envie o valor (ex.: 21,90):', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^dapp:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_desc';
  ctx.session.prodDescMode = 'append';
  await ctx.reply(
    'Descreva o texto a **anexar** ao final da descrição atual (pode ser várias linhas numa mensagem).',
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^dnew:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_desc';
  ctx.session.prodDescMode = 'replace';
  await ctx.reply(
    'Envie a **nova descrição completa** (substitui a atual).',
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^ppw:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_weight';
  await ctx.reply('Peso (kg), ex.: 12,5 ou 0 para limpar:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^ppm:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_dim';
  await ctx.reply(
    'Medidas / dimensões (texto livre, ex.: 30x40x10 cm). Envie — para limpar.',
    { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^iadd:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_photo';
  ctx.session.prodPhotoMode = 'add';
  await ctx.reply('Envie uma **foto** deste produto — será adicionada à galeria.', {
    parse_mode: 'Markdown',
    reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
  });
});

bot.callbackQuery(/^ir1:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_photo';
  ctx.session.prodPhotoMode = 'replace_first';
  await ctx.reply(
    [
      '📷 **Só a capa (mantém galeria)**',
      '',
      'Envie uma **foto**: ela passa a ser a **capa** e a 1.ª da galeria; **as restantes fotos do produto mantêm-se**.',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

/** Mensagens antigas podem ainda ter o botão `ir0`; comportamento = substituir tudo (igual a `ims`). */
bot.callbackQuery(/^ir0:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_photo';
  ctx.session.prodPhotoMode = 'replace_all';
  await ctx.reply(
    [
      '🔄 **Substituir todas as imagens**',
      '',
      '**Atenção:** a próxima foto **substitui todas** as imagens atuais deste produto; no site ficará **só essa**.',
      'Envie a foto quando estiver pronto.',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery('flow:orc_novo', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.awaiting = 'orc_nome';
  ctx.session.orcClienteNome = undefined;
  ctx.session.orcClienteEmail = undefined;
  await ctx.reply(
    [
      '➕ **Novo orçamento interno**',
      '',
      '1) Envie o **nome do cliente**.',
      '2) Depois o **email** (ou **-** para ignorar).',
      '3) Envie os itens, **uma linha por produto**:',
      '`DESCRIÇÃO ; quantidade ; preço unitário`',
      '4) Última linha: **OK**',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^oprint:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = String(ctx.match?.[1] ?? '').trim();
  if (!id) return;
  const { telegramUserId } = telegramIds(ctx);
  const r = await fetchTelegramOrcamentoPrintHtml(baseUrl!, integrationKey!, telegramUserId, id);
  if (!r.ok || !r.html) {
    await ctx.reply('Não foi possível gerar o HTML. Verifique permissão e ID.', {
      reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
    });
    return;
  }
  const safeName = `orcamento-${id}.html`;
  await ctx.replyWithDocument(new InputFile(Buffer.from(r.html, 'utf-8'), safeName), {
    caption:
      'Abra o ficheiro no telemóvel → partilhar → **Imprimir** → **Guardar como PDF** (como no site).',
    parse_mode: 'Markdown',
    reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
  });
});

bot.callbackQuery(/^tg:name:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_edit_name';
  await ctx.reply('Envie o novo nome do produto:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^qr:list:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
    await ctx.reply('Sem permissão para a fila de solicitações do site.', {
      reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
    });
    return;
  }
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
      await ctx.reply('Filtro desconhecido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
  }

  await sendTelegramQuoteList(ctx as BotContext, titles[kind] ?? kind, params);
});

bot.callbackQuery('qr:lookup_prompt', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
    await ctx.reply('Sem permissão.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  ctx.session.awaiting = 'quote_id_lookup';
  await ctx.reply(
    'Envie o ID da solicitação (24 caracteres, ex.: 674a…). Copie da lista ou do site.',
    { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
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
      ctx.session.prodDescMode = undefined;
      ctx.session.prodPhotoMode = undefined;
      ctx.session.prodCreate = undefined;
      ctx.session.orcClienteNome = undefined;
      ctx.session.orcClienteEmail = undefined;
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

  if (ctx.session.awaiting === 'prod_price_vista') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const price = parseUserPriceBr(text);
    if (price == null) {
      await ctx.reply('Preço inválido. Ex.: 19,90', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, { price });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(`Preço à vista gravado: ${formatBrl(price)}`, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }

  if (ctx.session.awaiting === 'prod_price_prazo') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const raw = text.trim();
    const pricePrazo =
      raw === '' || raw === '-' ? null : parseUserPriceBr(raw);
    if (raw !== '' && raw !== '-' && pricePrazo == null) {
      await ctx.reply('Preço a prazo inválido. Ex.: 21,90 ou **-** para limpar.', {
        parse_mode: 'Markdown',
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, {
      pricePrazo: pricePrazo ?? null,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(
      pricePrazo != null ? `Preço a prazo: ${formatBrl(pricePrazo)}` : 'Preço a prazo removido.',
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'prod_desc') {
    const mode = ctx.session.prodDescMode ?? 'replace';
    ctx.session.awaiting = undefined;
    ctx.session.prodDescMode = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const cur = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
    const prevDesc =
      cur.ok && typeof (cur.data as any)?.description === 'string'
        ? String((cur.data as any).description)
        : '';
    const body =
      mode === 'append'
        ? { description: prevDesc ? `${prevDesc.trim()}\n\n${text.trim()}` : text.trim() }
        : { description: text.trim() };
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, body);
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(
      mode === 'append' ? 'Texto anexado à descrição.' : 'Descrição substituída.',
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'prod_weight') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const raw = text.trim().replace(',', '.');
    const weight =
      raw === '' || raw === '-' ? null : parseFloat(raw);
    if (raw !== '' && raw !== '-' && !Number.isFinite(weight)) {
      await ctx.reply('Peso inválido. Ex.: 12,5 ou **-** para limpar.', {
        parse_mode: 'Markdown',
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, {
      weight: weight ?? null,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(
      weight != null ? `Peso gravado: ${weight} kg` : 'Peso removido.',
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'prod_dim') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const raw = text.trim();
    const dimensionsCm = raw === '' || raw === '-' ? null : raw;
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, {
      dimensionsCm,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(
      dimensionsCm != null ? `Medidas gravadas: ${dimensionsCm}` : 'Medidas limpas.',
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'orc_nome') {
    const nome = text.trim();
    if (nome.length < 2) {
      await ctx.reply('Nome do cliente muito curto.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    ctx.session.orcClienteNome = nome;
    ctx.session.awaiting = 'orc_email';
    await ctx.reply('Email do cliente (ou envie **-** para ignorar):', {
      parse_mode: 'Markdown',
      reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
    });
    return;
  }

  if (ctx.session.awaiting === 'orc_email') {
    const raw = text.trim();
    ctx.session.orcClienteEmail = raw === '-' ? null : raw;
    ctx.session.awaiting = 'orc_lines';
    await ctx.reply(
      [
        'Envie os **itens**, uma linha por produto:',
        '`DESCRIÇÃO ; quantidade ; preço unitário`',
        'Ex.: `Areia média ; 3 ; 120,00`',
        '',
        'Na **última linha** envie só: **OK**',
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'orc_lines') {
    ctx.session.awaiting = undefined;
    const nome = ctx.session.orcClienteNome?.trim();
    const email = ctx.session.orcClienteEmail;
    ctx.session.orcClienteNome = undefined;
    ctx.session.orcClienteEmail = undefined;
    if (!nome) {
      await ctx.reply('Fluxo perdido. Comece em 📋 Orçamentos → Novo orçamento.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    const parsed = parseOrcamentoItensBlock(text);
    if (!parsed.ok) {
      await ctx.reply(parsed.error, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const res = await postTelegramOrcamento(baseUrl!, integrationKey!, telegramUserId, {
      clienteNome: nome,
      clienteEmail: email,
      itens: parsed.items,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const oid = String((res.data as any)?.id ?? '');
    const kb = new InlineKeyboard()
      .text('📄 HTML (como PDF no site)', `oprint:${oid}`)
      .row()
      .text('🏠 Início', 'goto_menu');
    await ctx.reply(`Orçamento criado na base. ID: **${oid}**`, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
    return;
  }

  if (ctx.session.awaiting === 'prod_edit_name') {
    ctx.session.awaiting = undefined;
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply('Nome inválido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const res = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, { name });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply('Nome atualizado na base.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }

  if (ctx.session.awaiting === 'prod_create_flow' && ctx.session.prodCreate) {
    const d = ctx.session.prodCreate;
    const t = text.trim();

    if (d.step === 'name') {
      if (t.length < 2) {
        await ctx.reply('Nome muito curto.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
        return;
      }
      d.name = t;
      d.step = 'price';
      await ctx.reply('2/6 — **Preço à vista** (ex.: 19,90):', {
        parse_mode: 'Markdown',
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    if (d.step === 'price') {
      const price = parseUserPriceBr(t);
      if (price == null) {
        await ctx.reply('Preço inválido. Ex.: 19,90', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
        return;
      }
      d.price = price;
      d.step = 'category';
      await ctx.reply(
        '3/6 — **ID da categoria** (ObjectId Mongo, 24 caracteres). Copie do painel do site.',
        { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
      );
      return;
    }
    if (d.step === 'category') {
      if (!/^[a-f\d]{24}$/i.test(t)) {
        await ctx.reply('ID de categoria inválido. Deve ser 24 caracteres hex.', {
          reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
        });
        return;
      }
      d.categoryId = t;
      d.step = 'description';
      await ctx.reply('4/6 — **Descrição** do produto (pode ser várias linhas numa mensagem):', {
        parse_mode: 'Markdown',
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    if (d.step === 'description') {
      if (t.length < 2) {
        await ctx.reply('Descrição muito curta.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
        return;
      }
      d.description = t;
      d.step = 'pricePrazo';
      await ctx.reply(
        '5/6 — **Preço a prazo** (ex.: 21,90) ou envie **-** para não definir.',
        { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
      );
      return;
    }
    if (d.step === 'pricePrazo') {
      if (t === '-' || t === '') {
        d.pricePrazo = null;
      } else {
        const pz = parseUserPriceBr(t);
        if (pz == null) {
          await ctx.reply('Valor inválido ou use **-** para pular.', {
            parse_mode: 'Markdown',
            reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
          });
          return;
        }
        d.pricePrazo = pz;
      }
      d.step = 'images';
      d.imageUrls = [];
      await ctx.reply(
        [
          '6/6 — **Imagens**',
          '',
          'Envie uma ou várias **fotos** (uma foto por mensagem), ou envie **-** para criar sem imagem.',
          'Se errar a última foto, envie **trocar** ou **desfazer** para remover a última anexada.',
          'Depois mostramos o resumo para confirmar.',
        ].join('\n'),
        { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
      );
      return;
    }
    if (d.step === 'images') {
      if (t === '-' || t === '') {
        d.step = 'confirm';
        await showProdCreateConfirm(ctx, d);
        return;
      }
      const undo = /^(trocar|desfazer|voltar)$/i.test(t);
      if (undo) {
        const urls = d.imageUrls ?? [];
        if (urls.length === 0) {
          await ctx.reply('Não há foto para remover. Envie uma **foto** ou **-** para o resumo.', {
            parse_mode: 'Markdown',
            reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
          });
          return;
        }
        urls.pop();
        d.imageUrls = urls;
        await ctx.reply(
          `Última foto removida (${urls.length} na fila). Envie outra foto ou **-** para o resumo.`,
          { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
        );
        return;
      }
      await ctx.reply(
        'Envie uma **foto** por mensagem, **trocar** para apagar a última, ou **-** para terminar e ver o resumo.',
        { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
      );
      return;
    }
    if (d.step === 'confirm') {
      await ctx.reply('Use os botões Confirmar ou Cancelar na mensagem do resumo.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    return;
  }

  if (ctx.session.awaiting === 'product_search') {
    ctx.session.awaiting = undefined;
    if (!ctx.session.productMode) ctx.session.productMode = 'cadastro';
    const res = await getTelegramProductSearch(baseUrl!, integrationKey!, telegramUserId, text, 10);
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const items = (res.data as any)?.items;
    if (!Array.isArray(items) || items.length === 0) {
      await ctx.reply('Nenhum produto encontrado.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }

    /** Telegram: cada `callback_data` ≤ 64 bytes. Só enviamos o ObjectId; o detalhe vem da API em `p_`. */
    const kb = new InlineKeyboard();
    for (const it of items.slice(0, 10)) {
      const id = String(it?.id ?? '').trim();
      const name = String(it?.name ?? 'Produto').slice(0, 40);
      if (!id || !/^[a-f\d]{24}$/i.test(id)) continue;
      kb.text(name, `p_${id}`).row();
    }
    kb.text('Fechar', 'cancel_inline');

    await ctx.reply('Selecione um produto:', { reply_markup: kb });
    return;
  }

  if (ctx.session.awaiting === 'stock_delta') {
    const qty = parseInt(text, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      await ctx.reply('Informe um número válido (ex.: 2).', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const productId = ctx.session.selectedProductId;
    const sign = ctx.session.pendingStockSign;
    if (!productId || !sign) {
      ctx.session.awaiting = undefined;
      await ctx.reply('Fluxo perdido. Volte em Estoque e selecione o produto novamente.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
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
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply(
      `Estoque atualizado.\nAntes: ${(res.data as any)?.before ?? '?'} → Depois: ${(res.data as any)?.after ?? '?'}`,
      { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (ctx.session.awaiting === 'quote_note') {
    if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
      ctx.session.awaiting = undefined;
      ctx.session.pendingQuoteId = undefined;
      await ctx.reply('Sem permissão para notas em solicitações do site.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    const quoteId = ctx.session.pendingQuoteId;
    ctx.session.awaiting = undefined;
    ctx.session.pendingQuoteId = undefined;
    if (!quoteId) {
      await ctx.reply('Fluxo perdido. Abra Orçamentos novamente.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const note = text.trim();
    const res = await patchTelegramQuoteRequest(baseUrl!, integrationKey!, telegramUserId, quoteId, {
      followUpNote: note,
    });
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    await ctx.reply('Nota salva.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }

  if (ctx.session.awaiting === 'quote_id_lookup') {
    if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
      ctx.session.awaiting = undefined;
      await ctx.reply('Sem permissão para consultar solicitações do site.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    ctx.session.awaiting = undefined;
    const id = text.trim();
    if (!/^[a-f\d]{24}$/i.test(id)) {
      await ctx.reply('ID inválido. Use os 24 caracteres hex da solicitação.', {
        reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
      });
      return;
    }
    const res = await getTelegramQuoteById(baseUrl!, integrationKey!, telegramUserId, id);
    if (!res.ok) {
      await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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
  const raw = decodeURIComponent(encoded).trim();
  if (/^[a-f\d]{24}$/i.test(raw)) {
    return {
      id: raw,
      name: 'Produto',
      codigo: null,
      codBarra: null,
      stock: 0,
      price: 0,
      imageUrl: null,
    };
  }
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

type OrcamentoItemParsed = { produto: string; quantidade: number; precoUnitario: number };

function parseOrcamentoItensBlock(text: string): { ok: true; items: OrcamentoItemParsed[] } | { ok: false; error: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: OrcamentoItemParsed[] = [];
  let sawOk = false;
  for (const line of lines) {
    if (/^ok$/i.test(line)) {
      sawOk = true;
      continue;
    }
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 3) {
      return { ok: false, error: `Linha inválida (use ; entre descrição, qtd e preço):\n${line}` };
    }
    const produto = parts[0] ?? '';
    const qtyRaw = parts[1] ?? '';
    const priceRaw = parts.slice(2).join(';').trim();
    const quantidade = Math.max(1, Math.trunc(parseInt(qtyRaw, 10) || 0));
    const precoUnitario = parseUserPriceBr(priceRaw.replace(/\s/g, ''));
    if (!produto || !quantidade || precoUnitario == null) {
      return { ok: false, error: `Linha inválida:\n${line}` };
    }
    items.push({ produto, quantidade, precoUnitario });
  }
  if (!sawOk) {
    return { ok: false, error: 'Falta uma linha final só com: OK' };
  }
  if (items.length === 0) {
    return { ok: false, error: 'Nenhum item antes do OK.' };
  }
  return { ok: true, items };
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

function productHasGallery(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  const urls = Array.isArray(data.imageUrls)
    ? (data.imageUrls as unknown[]).map(String).filter(Boolean)
    : [];
  const primary = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
  return urls.length > 0 || !!primary;
}

/** Teclado principal do fluxo Produtos (cadastro): sem entrada/saída de stock. */
function kbProductCadastro(productId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('📄 Ficha completa', `tg:g:${productId}`)
    .row()
    .text('💰 Preço', `sub:pre:${productId}`)
    .text('📝 Descrição', `sub:des:${productId}`)
    .row()
    .text('🖼 Imagens', `sub:img:${productId}`)
    .row()
    .text('⚖️ Peso', `ppw:${productId}`)
    .text('📏 Medidas', `ppm:${productId}`)
    .row()
    .text('✏️ Nome', `tg:name:${productId}`)
    .row()
    .text('🔎 Nova busca', 'search_again')
    .text('🏠 Início', 'goto_menu')
    .row()
    .text('Fechar', 'cancel_inline');
}

function kbProductClienteConsulta(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔎 Nova busca', 'search_again')
    .text('🏠 Início', 'goto_menu')
    .row()
    .text('Fechar', 'cancel_inline');
}

function kbSubPreco(productId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('💵 À vista', `ppv:${productId}`)
    .text('💳 A prazo', `ppp:${productId}`)
    .row()
    .text('◀ Voltar', `backcad:${productId}`);
}

function kbSubDesc(productId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Nova', `dnew:${productId}`)
    .text('➕ Editar', `dapp:${productId}`)
    .row()
    .text('◀ Voltar', `backcad:${productId}`);
}

function kbSubImagens(productId: string, hasExisting: boolean): InlineKeyboard {
  const kb = new InlineKeyboard().text('📷 Nova imagem (várias)', `imn:${productId}`).row();
  if (hasExisting) {
    kb.text('🔄 Substituir (todas as fotos)', `ims:${productId}`).row();
  }
  kb.text('◀ Voltar', `backcad:${productId}`);
  return kb;
}

/** Após **Substituir** (substitui tudo): opção de mudar para “só capa” antes de enviar a foto. */
function kbSubSubstituirImagens(productId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('📷 Só a capa (mantém galeria)', `ir1:${productId}`)
    .row()
    .text('◀ Voltar', `sub:img:${productId}`);
}

async function showProdCreateConfirm(ctx: BotContext, d: NonNullable<SessionData['prodCreate']>) {
  const urls = d.imageUrls ?? [];
  const prazoLine =
    d.pricePrazo != null && Number.isFinite(d.pricePrazo)
      ? `Preço a prazo: ${formatBrl(d.pricePrazo)}`
      : 'Preço a prazo: —';
  const desc = String(d.description ?? '');
  const msg = [
    '📋 **Resumo do produto**',
    '',
    `Nome: ${d.name}`,
    `Preço à vista: ${formatBrl(d.price ?? 0)}`,
    prazoLine,
    `Categoria ID: ${d.categoryId}`,
    `Descrição: ${desc.slice(0, 500)}${desc.length > 500 ? '…' : ''}`,
    urls.length ? `Imagens: ${urls.length} foto(s)` : 'Imagens: nenhuma',
    '',
    'Confirma criar no banco?',
  ].join('\n');
  await ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text('✅ Confirmar', 'pcok').text('❌ Cancelar', 'pcnx'),
  });
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
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const list = (res.data as any)?.solicitacoes;
  const pag = (res.data as any)?.pagination;
  if (!Array.isArray(list) || list.length === 0) {
    await ctx.reply(`${title}\n\nNada encontrado com este filtro.`, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const total = typeof pag?.total === 'number' ? pag.total : list.length;
  const extra =
    total > list.length ? `\n…mostrando ${Math.min(5, list.length)} de ${total}.` : '';
  await ctx.reply(`${title}${extra}`, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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

bot.callbackQuery(/^backcad:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  const staff = isStaffNotClient(ctx.session.userRole);
  const markup = staff ? kbProductCadastro(productId) : kbProductClienteConsulta();
  await ctx.editMessageReplyMarkup({ reply_markup: markup }).catch(async () => {
    await ctx.reply('Abra o produto outra vez pela busca.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
  });
});

bot.callbackQuery(/^sub:pre:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  await ctx.editMessageReplyMarkup({ reply_markup: kbSubPreco(productId) }).catch(() => {});
});

bot.callbackQuery(/^sub:des:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  await ctx.editMessageReplyMarkup({ reply_markup: kbSubDesc(productId) }).catch(() => {});
});

bot.callbackQuery(/^sub:img:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  const { telegramUserId } = telegramIds(ctx);
  const fresh = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
  const data = fresh.ok ? (fresh.data as Record<string, unknown>) : null;
  await ctx
    .editMessageReplyMarkup({
      reply_markup: kbSubImagens(productId, productHasGallery(data)),
    })
    .catch(() => {});
});

bot.callbackQuery(/^ims:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  // Antes só se atualizava o teclado — sem `awaiting`, o envio da foto era ignorado em `message:photo`.
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_photo';
  ctx.session.prodPhotoMode = 'replace_all';
  await ctx.editMessageReplyMarkup({ reply_markup: kbSubSubstituirImagens(productId) }).catch(() => {});
  await ctx.reply(
    [
      '🔄 **Substituir imagens do produto**',
      '',
      '**Atenção:** a próxima foto que enviar vai **apagar todas as imagens atuais** deste produto (capa e galeria). No site ficará **só essa** imagem.',
      'Se quiser **manter as outras fotos** e trocar apenas a capa, toque **📷 Só a capa (mantém galeria)** na mensagem do produto **antes** de enviar a foto.',
      '',
      'Envie a **nova foto** quando estiver pronto.',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery(/^imn:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId) return;
  ctx.session.selectedProductId = productId;
  ctx.session.awaiting = 'prod_photo_multi';
  ctx.session.prodPhotoMode = 'add';
  ctx.session.prodPhotoNextPrimary = false;
  await ctx.reply(
    [
      '📷 Envie **uma foto por mensagem** (pode enviar várias seguidas).',
      'Toque **📌 Próxima = capa** antes de enviar se quiser que a **próxima** foto substitua a imagem principal (mantém o resto na galeria).',
      'Quando terminar, toque **✅ Concluir envio**.',
      '',
      '**Substituir (todas as fotos)** no produto apaga a galeria inteira; use **📷 Só a capa** se quiser manter as outras imagens.',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📌 Próxima = capa', `imcap:${productId}`)
        .row()
        .text('✅ Concluir envio', `imdone:${productId}`),
    }
  );
});

bot.callbackQuery(/^imcap:([a-f\d]{24})$/i, async (ctx) => {
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId || ctx.session.selectedProductId !== productId) {
    await ctx.answerCallbackQuery({ text: 'Abra o envio múltiplo outra vez.', show_alert: true });
    return;
  }
  if (ctx.session.awaiting !== 'prod_photo_multi') {
    await ctx.answerCallbackQuery({ text: 'Fluxo inválido.', show_alert: true });
    return;
  }
  ctx.session.prodPhotoNextPrimary = true;
  await ctx.answerCallbackQuery({ text: 'A próxima foto será a capa.' });
});

bot.callbackQuery(/^imdone:([a-f\d]{24})$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = String(ctx.match?.[1] ?? '').trim();
  if (!productId || ctx.session.selectedProductId !== productId) return;
  ctx.session.awaiting = undefined;
  ctx.session.prodPhotoMode = undefined;
  ctx.session.prodPhotoNextPrimary = undefined;
  await ctx.reply('Envio de imagens encerrado. Pode voltar ao produto pela busca.', {
    reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
  });
});

bot.callbackQuery('pcok', async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = ctx.session.prodCreate;
  if (!draft || draft.step !== 'confirm') {
    await ctx.reply('Nada a confirmar.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const { telegramUserId } = telegramIds(ctx);
  const name = (draft.name ?? '').trim();
  const description = (draft.description ?? '').trim();
  const categoryId = (draft.categoryId ?? '').trim();
  const price = draft.price;
  if (!name || !description || !categoryId || price == null || !Number.isFinite(price)) {
    ctx.session.prodCreate = undefined;
    ctx.session.awaiting = undefined;
    await ctx.reply('Dados incompletos. Recomece o cadastro.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const newId = String((res.data as any)?.id ?? '').trim();
  const urls = draft.imageUrls ?? [];
  const prazo = draft.pricePrazo;
  if (newId && (urls.length > 0 || (prazo != null && Number.isFinite(prazo)))) {
    const patchBody: Record<string, unknown> = {};
    if (prazo != null && Number.isFinite(prazo)) patchBody.pricePrazo = prazo;
    if (urls.length > 0) {
      patchBody.imageUrls = urls;
      patchBody.imageUrl = urls[0];
    }
    const pr = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, newId, patchBody);
    if (!pr.ok) {
      await ctx.reply(
        `Produto criado (ID ${newId}), mas falhou ao aplicar imagens/preço a prazo: ${formatApiError(pr.data as any, pr.status)}`,
        { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
      );
      ctx.session.prodCreate = undefined;
      ctx.session.awaiting = undefined;
      return;
    }
  }
  ctx.session.prodCreate = undefined;
  ctx.session.awaiting = undefined;
  await ctx.reply(
    `✅ Produto criado no banco.\nID: **${newId}**${urls.length ? `\n${urls.length} imagem(ns).` : ''}`,
    { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
  );
});

bot.callbackQuery('pcnx', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.prodCreate = undefined;
  ctx.session.awaiting = undefined;
  await ctx.reply('Cadastro cancelado.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^p_(.+)$/is, async (ctx) => {
  await ctx.answerCallbackQuery();
  const token = String(ctx.match?.[1] ?? '').trim();
  let product = decodeProductCallbackToken(token);
  if (!product?.id) return;
  const productId = product.id;
  ctx.session.selectedProductId = productId;

  const { telegramUserId } = telegramIds(ctx);
  const fresh = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
  if (fresh.ok) {
    const p = fresh.data as Record<string, unknown>;
    product = {
      id: productId,
      name: String(p.name ?? product.name),
      codigo: p.codigo != null ? String(p.codigo) : product.codigo,
      codBarra: p.codBarra != null ? String(p.codBarra) : product.codBarra,
      stock:
        typeof p.stock === 'number'
          ? Math.trunc(p.stock)
          : Number.isFinite(Number(p.stock))
            ? Math.trunc(Number(p.stock))
            : product.stock,
      price: typeof p.price === 'number' ? p.price : Number(p.price) || product.price,
      imageUrl: null,
    };
  }

  const mode = ctx.session.productMode ?? 'cadastro';
  const staff = isStaffNotClient(ctx.session.userRole);

  const data = fresh.ok ? (fresh.data as Record<string, unknown>) : null;
  const lines = [
    `✅ ${product.name}`,
    '',
    product.codigo ? `Código: ${product.codigo}` : null,
    product.codBarra ? `EAN/cód. barras: ${product.codBarra}` : null,
    `Em estoque: ${product.stock}`,
    `Preço à vista: ${formatBrl(product.price)}`,
    data && typeof data.pricePrazo === 'number' && Number.isFinite(data.pricePrazo)
      ? `Preço a prazo: ${formatBrl(data.pricePrazo as number)}`
      : null,
    data && data.weight != null && String(data.weight).trim() !== ''
      ? `Peso: ${String(data.weight)} kg`
      : null,
    data && data.dimensionsCm != null && String(data.dimensionsCm).trim() !== ''
      ? `Medidas: ${String(data.dimensionsCm)}`
      : null,
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
    lines.push('', 'Perfil cliente: consulta rápida aqui. Para stock use 📦 Estoque no menu.');
  }

  const kb = staff ? kbProductCadastro(productId) : kbProductClienteConsulta();

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
  await ctx.reply('Informe a quantidade:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery(/^q:detail:(.+)$/i, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
    await ctx.reply('Sem permissão.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const id = String(ctx.match?.[1] ?? '').trim();
  if (!id) return;
  const { telegramUserId } = telegramIds(ctx);
  const res = await getTelegramQuoteById(baseUrl!, integrationKey!, telegramUserId, id);
  if (!res.ok) {
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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
  if (!canManageTelegramClientQuoteRequests(ctx.session.userRole)) {
    await ctx.reply('Sem permissão.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const action = String(ctx.match?.[1] ?? '');
  const quoteId = String(ctx.match?.[2] ?? '').trim();
  if (!quoteId) return;
  const { telegramUserId } = telegramIds(ctx);

  if (action === 'note') {
    ctx.session.awaiting = 'quote_note';
    ctx.session.pendingQuoteId = quoteId;
    await ctx.reply('Digite a nota:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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
    await ctx.reply(formatApiError(res.data as any, res.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  await ctx.reply('Ok.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
});

bot.callbackQuery('search_again', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.awaiting = 'product_search';
  if (!ctx.session.productMode) ctx.session.productMode = 'cadastro';
  await ctx.reply('Digite nome, código ou EAN do produto:', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
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

/** Evita upload para o Macofel quando não há fluxo ativo (antes o update era ignorado em silêncio). */
function isAwaitingProductImageUpload(
  awaiting: SessionData['awaiting'],
  draft: SessionData['prodCreate'] | undefined
): boolean {
  if (awaiting === 'prod_photo_multi' || awaiting === 'prod_photo') return true;
  if (awaiting === 'prod_create_flow' && draft?.step === 'images') return true;
  return false;
}

async function continueAfterProductImageUpload(ctx: BotContext, imageUrl: string): Promise<void> {
  const aw = ctx.session.awaiting;
  const draft = ctx.session.prodCreate;
  const { telegramUserId } = telegramIds(ctx);

  if (aw === 'prod_create_flow' && draft?.step === 'images') {
    if (!draft.imageUrls) draft.imageUrls = [];
    draft.imageUrls.push(imageUrl);
    const n = draft.imageUrls.length;
    await ctx.reply(
      `Foto ${n} anexada ao cadastro. Envie mais fotos ou uma mensagem **-** para ver o resumo.`,
      { parse_mode: 'Markdown', reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) }
    );
    return;
  }

  if (aw === 'prod_photo_multi') {
    const productId = ctx.session.selectedProductId;
    if (!productId) {
      ctx.session.awaiting = undefined;
      ctx.session.prodPhotoMode = undefined;
      ctx.session.prodPhotoNextPrimary = undefined;
      await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const cur = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
    if (!cur.ok) {
      await ctx.reply(formatApiError(cur.data as any, cur.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const p = cur.data as Record<string, unknown>;
    const existingRaw = Array.isArray(p.imageUrls) ? (p.imageUrls as string[]) : [];
    const existing = existingRaw.map(String).filter(Boolean);
    const primary = typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '';
    const nextPrimary = ctx.session.prodPhotoNextPrimary === true;
    let imageUrls: string[];
    let imageUrlOut: string;
    if (nextPrimary) {
      ctx.session.prodPhotoNextPrimary = false;
      const seen = new Set<string>();
      const rest: string[] = [];
      const push = (u: string) => {
        const t = u.trim();
        if (!t || t === imageUrl || seen.has(t)) return;
        seen.add(t);
        rest.push(t);
      };
      if (primary) push(primary);
      for (const u of existing) push(String(u));
      imageUrls = [imageUrl, ...rest];
      imageUrlOut = imageUrl;
    } else {
      const merged = existing.includes(imageUrl) ? existing : [...existing, imageUrl];
      imageUrls = merged;
      imageUrlOut = primary || merged[0] || imageUrl;
    }
    const patch = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, {
      imageUrl: imageUrlOut,
      imageUrls,
    });
    if (!patch.ok) {
      await ctx.reply(formatApiError(patch.data as any, patch.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
      return;
    }
    const kb = new InlineKeyboard()
      .text('📌 Próxima = capa', `imcap:${productId}`)
      .row()
      .text('✅ Concluir envio', `imdone:${productId}`);
    await ctx.reply(
      nextPrimary
        ? `**Capa atualizada** com a última foto. Envie mais imagens ou toque **Concluir envio**.`
        : `Imagem adicionada à galeria. Envie mais ou toque **Concluir envio** quando terminar.`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    return;
  }

  if (aw !== 'prod_photo') return;

  const productId = ctx.session.selectedProductId;
  const mode = ctx.session.prodPhotoMode ?? 'add';
  if (!productId) {
    ctx.session.awaiting = undefined;
    ctx.session.prodPhotoMode = undefined;
    ctx.session.prodPhotoNextPrimary = undefined;
    await ctx.reply('Fluxo perdido.', { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }

  const cur = await getTelegramProductById(baseUrl!, integrationKey!, telegramUserId, productId);
  if (!cur.ok) {
    ctx.session.awaiting = undefined;
    ctx.session.prodPhotoMode = undefined;
    ctx.session.prodPhotoNextPrimary = undefined;
    await ctx.reply(formatApiError(cur.data as any, cur.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const p = cur.data as Record<string, unknown>;
  const existingRaw = Array.isArray(p.imageUrls) ? (p.imageUrls as string[]) : [];
  const existing = existingRaw.map(String).filter(Boolean);
  const primary = typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '';

  let imageUrls: string[];
  let imageUrlOut: string | null;

  if (mode === 'add') {
    imageUrls = existing.includes(imageUrl) ? existing : [...existing, imageUrl];
    imageUrlOut = primary || imageUrls[0] || imageUrl;
  } else if (mode === 'replace_first') {
    imageUrlOut = imageUrl;
    const rest = existing.filter((u) => u !== imageUrl);
    imageUrls = [imageUrl, ...rest.filter((u) => u !== primary)];
  } else {
    imageUrlOut = imageUrl;
    imageUrls = [imageUrl];
  }

  const patch = await patchTelegramProduct(baseUrl!, integrationKey!, telegramUserId, productId, {
    imageUrl: imageUrlOut,
    imageUrls,
  });
  ctx.session.awaiting = undefined;
  ctx.session.prodPhotoMode = undefined;
  ctx.session.prodPhotoNextPrimary = undefined;
  if (!patch.ok) {
    await ctx.reply(formatApiError(patch.data as any, patch.status), { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const doneMsg =
    mode === 'replace_all'
      ? '✅ **Todas as imagens anteriores foram substituídas.** Este produto fica agora só com esta foto na loja.'
      : mode === 'replace_first'
        ? '✅ **Capa atualizada.** As outras fotos da galeria mantiveram-se.'
        : 'Imagem guardada na base.';
  await ctx.reply(doneMsg, {
    parse_mode: 'Markdown',
    reply_markup: opsMenuReplyKeyboard(ctx.session.userRole),
  });
}

async function downloadTelegramFileToBuffer(fileId: string): Promise<
  { ok: true; buf: Buffer; ext: string; mime: string } | { ok: false; error: string }
> {
  let file: { file_path?: string };
  try {
    file = await bot.api.getFile(fileId);
  } catch {
    return { ok: false, error: 'Não foi possível ler o ficheiro.' };
  }
  if (!file.file_path) {
    return { ok: false, error: 'Ficheiro inválido.' };
  }
  const dlUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  let buf: Buffer;
  try {
    const res = await fetch(dlUrl);
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    return { ok: false, error: 'Falha ao transferir a imagem.' };
  }
  const ext = (file.file_path.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { ok: true, buf, ext, mime };
}

async function uploadBufferToMacofelProductImage(
  telegramUserId: string,
  buf: Buffer,
  mime: string,
  filename: string
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string; data?: any; status?: number }> {
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), filename);
  const up = await fetch(`${baseUrl!.replace(/\/$/, '')}/api/telegram/products/upload-image`, {
    method: 'POST',
    headers: {
      'X-Telegram-Key': integrationKey!,
      'x-telegram-userid': telegramUserId,
    },
    body: form,
  });
  const upData = (await up.json().catch(() => ({}))) as Record<string, unknown>;
  if (!up.ok) {
    return { ok: false, error: formatApiError(upData, up.status), data: upData, status: up.status };
  }
  const imageUrl = String(upData.imageUrl ?? '').trim();
  if (!imageUrl) {
    return { ok: false, error: 'Upload sem URL.' };
  }
  return { ok: true, imageUrl };
}

bot.on('message:photo', async (ctx) => {
  const aw = ctx.session.awaiting;
  const draft = ctx.session.prodCreate;
  const photos = ctx.message?.photo;
  if (!photos?.length) return;
  if (!isAwaitingProductImageUpload(aw, draft)) return;

  const best = photos[photos.length - 1];
  const got = await downloadTelegramFileToBuffer(best.file_id);
  if (!got.ok) {
    await ctx.reply(got.error, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const { telegramUserId } = telegramIds(ctx);
  const filename = `tg_${Date.now()}.${got.ext}`;
  const uploaded = await uploadBufferToMacofelProductImage(telegramUserId, got.buf, got.mime, filename);
  if (!uploaded.ok) {
    await ctx.reply(uploaded.error, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  await continueAfterProductImageUpload(ctx, uploaded.imageUrl);
});

/** Imagem enviada como ficheiro (comum no Telegram Desktop) — mesmo fluxo que `message:photo`. */
bot.on('message:document', async (ctx) => {
  const aw = ctx.session.awaiting;
  const draft = ctx.session.prodCreate;
  const doc = ctx.message?.document;
  if (!doc?.file_id) return;
  const mime = String(doc.mime_type ?? '');
  if (!mime.startsWith('image/')) return;
  if (!isAwaitingProductImageUpload(aw, draft)) return;

  const got = await downloadTelegramFileToBuffer(doc.file_id);
  if (!got.ok) {
    await ctx.reply(got.error, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  const { telegramUserId } = telegramIds(ctx);
  const baseName = doc.file_name ? String(doc.file_name).replace(/[^\w.\-]+/g, '_').slice(0, 80) : `tg_${Date.now()}.${got.ext}`;
  const filename = baseName.includes('.') ? baseName : `${baseName}.${got.ext}`;
  const uploaded = await uploadBufferToMacofelProductImage(telegramUserId, got.buf, got.mime, filename);
  if (!uploaded.ok) {
    await ctx.reply(uploaded.error, { reply_markup: opsMenuReplyKeyboard(ctx.session.userRole) });
    return;
  }
  await continueAfterProductImageUpload(ctx, uploaded.imageUrl);
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
