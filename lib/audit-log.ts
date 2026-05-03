import prisma from '@/lib/db';
import type { AuditLogSource } from '../.prisma/postgres-client';

export type { AuditLogSource };

export async function writeAuditLog(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  source?: AuditLogSource;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      source: input.source ?? 'site',
      ...(input.metadata !== undefined ? { metadata: input.metadata as object } : {}),
    },
  });
}

/** Não bloqueia a operação principal se o registo de auditoria falhar (ex.: PDV em rede). */
export function writeAuditLogDeferred(input: Parameters<typeof writeAuditLog>[0]) {
  void writeAuditLog(input).catch(() => {});
}
