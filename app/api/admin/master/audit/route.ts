import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '../../../../../.prisma/postgres-client';
import prisma from '@/lib/db';
import { requireMasterAdminSession } from '@/lib/require-master-admin';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const SOURCE_VALUES = ['site', 'pdv', 'telegram'] as const;
type SourceFilter = (typeof SOURCE_VALUES)[number] | 'all';

function parseSource(v: string | null): SourceFilter {
  if (!v || v === 'all') return 'all';
  if ((SOURCE_VALUES as readonly string[]).includes(v)) {
    return v as (typeof SOURCE_VALUES)[number];
  }
  return 'all';
}

function parseIsoDate(v: string | null, endOfDay: boolean): Date | null {
  if (!v?.trim()) return null;
  const d = new Date(v.trim());
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

function decodeCursor(raw: string | null): { createdAt: Date; id: string } | null {
  if (!raw?.trim()) return null;
  const pipe = raw.indexOf('|');
  if (pipe <= 0) return null;
  const iso = raw.slice(0, pipe);
  const id = raw.slice(pipe + 1);
  if (!id) return null;
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? '40', 10) || 40)
  );

  const source = parseSource(searchParams.get('source'));
  const q = searchParams.get('q')?.trim() ?? '';
  const actorEmail = searchParams.get('actorEmail')?.trim().toLowerCase() ?? '';
  const actionContains = searchParams.get('action')?.trim() ?? '';
  const from = parseIsoDate(searchParams.get('from'), false);
  const to = parseIsoDate(searchParams.get('to'), true);
  const cursor = decodeCursor(searchParams.get('cursor'));

  const whereParts: Prisma.AuditLogWhereInput[] = [];

  if (source !== 'all') {
    whereParts.push({ source });
  }

  if (from) {
    whereParts.push({ createdAt: { gte: from } });
  }
  if (to) {
    whereParts.push({ createdAt: { lte: to } });
  }

  if (actorEmail) {
    whereParts.push({
      actorEmail: { contains: actorEmail, mode: 'insensitive' },
    });
  }

  if (actionContains) {
    whereParts.push({
      action: { contains: actionContains, mode: 'insensitive' },
    });
  }

  if (q) {
    whereParts.push({
      OR: [
        { action: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { targetId: { contains: q, mode: 'insensitive' } },
        { targetType: { contains: q, mode: 'insensitive' } },
        { actorId: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (cursor) {
    whereParts.push({
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
        },
      ],
    });
  }

  const where: Prisma.AuditLogWhereInput =
    whereParts.length === 0 ? {} : { AND: whereParts };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      actorId: true,
      actorEmail: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      source: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return NextResponse.json({
    items: page,
    nextCursor,
    filters: { source, limit },
  });
}
