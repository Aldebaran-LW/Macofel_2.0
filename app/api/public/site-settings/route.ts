import { NextResponse } from 'next/server';
import { getTaxDefaultPercent } from '@/lib/server-app-settings';
import { getMergedAppSettings } from '@/lib/app-settings-store';

export const dynamic = 'force-dynamic';

/** Dados não sensíveis para o storefront (checkout, carrinho). */
export async function GET() {
  try {
    const [tax_default_percent, merged] = await Promise.all([
      getTaxDefaultPercent(),
      getMergedAppSettings(),
    ]);
    return NextResponse.json({
      tax_default_percent,
      devnota_enabled: Boolean(merged.devnota_enabled),
    });
  } catch {
    return NextResponse.json({ tax_default_percent: 0, devnota_enabled: false });
  }
}
