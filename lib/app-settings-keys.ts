/** Chaves persistidas em `app_settings` (editáveis no painel Master). */
export const APP_SETTING_KEYS = [
  'tax_default_percent',
  'devnota_enabled',
  'pdv_notes',
] as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export const APP_SETTING_DEFAULTS: Record<AppSettingKey, unknown> = {
  tax_default_percent: 0,
  devnota_enabled: false,
  pdv_notes: '',
};

export function isAppSettingKey(k: string): k is AppSettingKey {
  return (APP_SETTING_KEYS as readonly string[]).includes(k);
}

export function parseSettingsPatch(body: unknown): { ok: true; values: Record<AppSettingKey, unknown> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body deve ser um objeto' };
  }

  const raw = body as Record<string, unknown>;
  const out: Partial<Record<AppSettingKey, unknown>> = {};

  for (const key of APP_SETTING_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];

    if (key === 'tax_default_percent') {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return { ok: false, error: 'tax_default_percent deve ser um número entre 0 e 100' };
      }
      out[key] = n;
      continue;
    }

    if (key === 'devnota_enabled') {
      if (typeof v !== 'boolean') {
        return { ok: false, error: 'devnota_enabled deve ser boolean' };
      }
      out[key] = v;
      continue;
    }

    if (key === 'pdv_notes') {
      if (typeof v !== 'string') {
        return { ok: false, error: 'pdv_notes deve ser texto' };
      }
      if (v.length > 4000) {
        return { ok: false, error: 'pdv_notes: máximo 4000 caracteres' };
      }
      out[key] = v;
    }
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'Nenhuma chave válida enviada' };
  }

  return { ok: true, values: out as Record<AppSettingKey, unknown> };
}
