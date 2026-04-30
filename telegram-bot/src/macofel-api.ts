export type LinkMode = 'code' | 'phone';

export type TelegramMeResponse =
  | { linked: false }
  | {
      linked: true;
      user: { id: string; email: string; role: string; name: string };
      telegram: {
        telegramUserId: string;
        telegramChatId: string | null;
        telegramUsername: string | null;
        phoneE164: string | null;
      };
    };

export type LinkBody =
  | {
      mode: 'code';
      code: string;
      telegramUserId: string;
      telegramChatId?: string | null;
      telegramUsername?: string | null;
    }
  | {
      mode: 'phone';
      phone: string;
      telegramUserId: string;
      telegramChatId?: string | null;
      telegramUsername?: string | null;
    };

export async function postTelegramLink(
  baseUrl: string,
  integrationKey: string,
  body: LinkBody
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/link`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function getTelegramMe(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string
): Promise<{ ok: boolean; status: number; data: TelegramMeResponse | Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/me?telegramUserId=${encodeURIComponent(
    telegramUserId
  )}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Telegram-Key': integrationKey,
    },
  });
  const data = (await res.json().catch(() => ({}))) as any;
  return { ok: res.ok, status: res.status, data };
}

export function formatApiError(data: Record<string, unknown>, status: number): string {
  const err = data?.error;
  if (typeof err === 'string' && err.trim()) return err;
  return `Falha na API (HTTP ${status})`;
}
