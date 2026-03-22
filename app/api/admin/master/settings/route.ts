import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import { parseSettingsPatch } from '@/lib/app-settings-keys';
import { getMergedAppSettings, upsertAppSettings } from '@/lib/app-settings-store';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const settings = await getMergedAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = parseSettingsPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await upsertAppSettings(parsed.values);

  const u = auth.session.user as { id?: string; email?: string | null };
  await writeAuditLog({
    actorId: u.id ?? null,
    actorEmail: u.email ?? null,
    action: 'app_settings.updated',
    targetType: 'app_settings',
    metadata: { keys: Object.keys(parsed.values) },
  });

  const settings = await getMergedAppSettings();
  return NextResponse.json({ ok: true, settings });
}
