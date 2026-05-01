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

export type TelegramProductSearchItem = {
  id: string;
  name: string;
  codigo: string | null;
  codBarra: string | null;
  stock: number;
  price: number;
  imageUrl: string | null;
};

export async function getTelegramProductSearch(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  q: string,
  limit = 10
): Promise<{ ok: boolean; status: number; data: { items: TelegramProductSearchItem[] } | Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/products/search?q=${encodeURIComponent(
    q
  )}&limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
  });
  const data = (await res.json().catch(() => ({}))) as any;
  return { ok: res.ok, status: res.status, data };
}

export async function postTelegramStockMove(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  body: { productId: string; delta: number; reason?: string | null }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/stock/move`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function getTelegramQuoteRequests(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  params?: {
    status?: string;
    page?: number;
    limit?: number;
    followUpNew?: boolean;
    assignee?: 'any' | 'none' | 'me';
  }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const urlObj = new URL(`${baseUrl.replace(/\/$/, '')}/api/telegram/quote-requests`);
  if (params?.status) urlObj.searchParams.set('status', String(params.status));
  if (params?.page) urlObj.searchParams.set('page', String(params.page));
  if (params?.limit) urlObj.searchParams.set('limit', String(params.limit));
  if (params?.followUpNew) urlObj.searchParams.set('followUpNew', '1');
  if (params?.assignee) urlObj.searchParams.set('assignee', params.assignee);
  const res = await fetch(urlObj.toString(), {
    method: 'GET',
    headers: {
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function getTelegramProductById(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  productId: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/products/${encodeURIComponent(productId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function patchTelegramProduct(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  productId: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/products/${encodeURIComponent(productId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function postTelegramProductCreate(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  body: { name: string; description: string; categoryId: string; price: number; stock?: number }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/products/create`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function getTelegramQuoteById(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  id: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/quote-requests/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export async function patchTelegramQuoteRequest(
  baseUrl: string,
  integrationKey: string,
  telegramUserId: string,
  id: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/quote-requests/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Key': integrationKey,
      'x-telegram-userid': telegramUserId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function formatApiError(data: Record<string, unknown>, status: number): string {
  const err = data?.error;
  if (typeof err === 'string' && err.trim()) return err;
  return `Falha na API (HTTP ${status})`;
}
