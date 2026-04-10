import 'dotenv/config';
import http from 'node:http';
import { Bot, Keyboard } from 'grammy';
import { postTelegramLink, formatApiError } from './macofel-api.js';
/** Render (e similares) injeta PORT — o Web Service precisa de um listener HTTP. */
function startHealthServerIfPortSet() {
    const raw = process.env.PORT;
    if (raw == null || String(raw).trim() === '')
        return;
    const port = Number(raw);
    if (!Number.isFinite(port) || port <= 0)
        return;
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
function requireEnv() {
    const missing = [];
    if (!token)
        missing.push('TELEGRAM_BOT_TOKEN');
    if (!integrationKey)
        missing.push('TELEGRAM_INTEGRATION_KEY');
    if (!baseUrl)
        missing.push('MACOFEL_BASE_URL');
    if (missing.length) {
        console.error(`[telegram-bot] Variáveis em falta: ${missing.join(', ')}. Copie telegram-bot/.env.example para telegram-bot/.env`);
        process.exit(1);
    }
}
requireEnv();
startHealthServerIfPortSet();
const bot = new Bot(token);
function telegramIds(ctx) {
    const telegramUserId = String(ctx.from?.id ?? '');
    const telegramChatId = ctx.chat?.id != null ? String(ctx.chat.id) : telegramUserId;
    const telegramUsername = ctx.from?.username?.trim() || null;
    return { telegramUserId, telegramChatId, telegramUsername };
}
bot.command('start', async (ctx) => {
    await ctx.reply([
        'Olá! Sou o assistente Macofel.',
        '',
        'Para vincular esta conta ao seu utilizador do site:',
        '• /entrar — partilhe o número (tem de coincidir com o telefone cadastrado pelo admin).',
        '• /vincular CODIGO — código gerado em Admin → Telegram no painel (web).',
        '',
        'Depois de vinculado, poderá usar os comandos de catálogo quando estiverem disponíveis.',
    ].join('\n'));
});
bot.command('entrar', async (ctx) => {
    const keyboard = new Keyboard().requestContact('Partilhar o meu número').resized();
    await ctx.reply('Toque no botão abaixo para partilhar o número associado à sua conta Telegram. ' +
        'O número tem de estar cadastrado no site pelo administrador.', { reply_markup: keyboard });
});
/** /vincular ABCD-EFGH ou /vincular ABCDEFGH */
bot.command('vincular', async (ctx) => {
    const text = ctx.message?.text?.trim() ?? '';
    const arg = text.split(/\s+/).slice(1).join(' ').trim();
    if (!arg) {
        await ctx.reply('Use: /vincular CODIGO (ex.: /vincular ABCD-12EF)');
        return;
    }
    const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);
    const { ok, status, data } = await postTelegramLink(baseUrl, integrationKey, {
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
    await ctx.reply('Teclado removido.', { reply_markup: { remove_keyboard: true } });
});
bot.on('message:contact', async (ctx) => {
    const contact = ctx.message.contact;
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
    const { telegramUserId, telegramChatId, telegramUsername } = telegramIds(ctx);
    const { ok, status, data } = await postTelegramLink(baseUrl, integrationKey, {
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
        return;
    }
    await ctx.reply(formatApiError(data, status), {
        reply_markup: { remove_keyboard: true },
    });
});
bot.catch((err) => {
    console.error('[telegram-bot]', err);
});
console.info('[telegram-bot] A iniciar (long polling)…');
bot.start({
    onStart: (info) => {
        console.info(`[telegram-bot] @${info.username} (${info.id})`);
    },
});
