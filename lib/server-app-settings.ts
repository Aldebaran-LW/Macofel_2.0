import { getMergedAppSettings } from '@/lib/app-settings-store';

/** Percentagem 0–100 configurada em Master (taxa sobre o subtotal do pedido). */
export async function getTaxDefaultPercent(): Promise<number> {
  try {
    const s = await getMergedAppSettings();
    const v = s.tax_default_percent;
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
    return Math.min(100, Math.max(0, v));
  } catch {
    return 0;
  }
}
