import prisma from '@/lib/db';
import {
  APP_SETTING_DEFAULTS,
  APP_SETTING_KEYS,
  type AppSettingKey,
} from '@/lib/app-settings-keys';

export async function getMergedAppSettings(): Promise<Record<AppSettingKey, unknown>> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...APP_SETTING_KEYS] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<AppSettingKey, unknown> = { ...APP_SETTING_DEFAULTS };
  for (const k of APP_SETTING_KEYS) {
    if (map.has(k)) {
      out[k] = map.get(k);
    }
  }
  return out;
}

export async function upsertAppSettings(values: Partial<Record<AppSettingKey, unknown>>) {
  const entries = Object.entries(values).filter(([k]) =>
    APP_SETTING_KEYS.includes(k as AppSettingKey)
  ) as [AppSettingKey, unknown][];

  if (entries.length === 0) return;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      })
    )
  );
}
