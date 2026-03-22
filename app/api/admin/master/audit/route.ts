import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireMasterAdminSession } from '@/lib/require-master-admin';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? '80', 10) || 80)
  );

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      actorId: true,
      actorEmail: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items: rows });
}
