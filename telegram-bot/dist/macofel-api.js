export async function postTelegramLink(baseUrl, integrationKey, body) {
    const url = `${baseUrl.replace(/\/$/, '')}/api/telegram/link`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Key': integrationKey,
        },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({})));
    return { ok: res.ok, status: res.status, data };
}
export function formatApiError(data, status) {
    const err = data?.error;
    if (typeof err === 'string' && err.trim())
        return err;
    return `Falha na API (HTTP ${status})`;
}
