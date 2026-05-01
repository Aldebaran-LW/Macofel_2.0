type WakeState = {
  lastAtMs: number;
};

const g = globalThis as unknown as { __telegramRenderWake?: WakeState };

function getState(): WakeState {
  if (!g.__telegramRenderWake) g.__telegramRenderWake = { lastAtMs: 0 };
  return g.__telegramRenderWake;
}

export function normalizeWakeUrl(raw: string): string | null {
  const s = raw.trim().replace(/\/$/, '');
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

/**
 * Opcionalmente “acorda” o serviço do bot na Render fazendo GET no `/health`.
 * Deve usar throttle curto porque roda durante navegações do site em produção.
 */
export async function pingTelegramBotWakeIfStale(params?: {
  minIntervalMs?: number;
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const wakeUrlRaw =
    process.env.TELEGRAM_BOT_WAKE_URL?.trim() ||
    'https://macofel-telegram-bot.onrender.com/health';
  const wakeUrl = normalizeWakeUrl(wakeUrlRaw);
  if (!wakeUrl) return;

  const minIntervalMs = Math.max(
    60_000,
    Number(params?.minIntervalMs ?? process.env.TELEGRAM_BOT_WAKE_MIN_MS ?? 10 * 60_000)
  );

  const now = Date.now();
  const state = getState();
  if (now - state.lastAtMs < minIntervalMs) return;

  state.lastAtMs = now;

  // Fire-and-forget para não aumentar latência do request do site.
  void fetch(wakeUrl, {
    method: 'GET',
    headers: {
      'user-agent': 'macofel-site/telegram-wake',
    },
    // Evita ficar pendurado se o upstream estiver lento/fora:
    signal: AbortSignal.timeout(4500),
  }).catch(() => {});
}
