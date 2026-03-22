import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireMasterAdminSession } from '@/lib/require-master-admin';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 8000;

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const format = searchParams.get('format') ?? 'json';

  if (type !== 'orders' && type !== 'users') {
    return NextResponse.json({ error: 'Use type=orders ou type=users' }, { status: 400 });
  }
  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'Use format=json ou format=csv' }, { status: 400 });
  }

  const actor = auth.session.user as { id?: string; email?: string | null };

  if (type === 'users') {
    const users = await prisma.user.findMany({
      take: MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        cpf: true,
        phone: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      actorId: actor.id ?? null,
      actorEmail: actor.email ?? null,
      action: 'export.generated',
      targetType: 'export',
      metadata: { type: 'users', format, rowCount: users.length },
    });

    if (format === 'json') {
      return new NextResponse(JSON.stringify(users, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="macofel-users-${Date.now()}.json"`,
        },
      });
    }

    const cols = ['id', 'email', 'firstName', 'lastName', 'role', 'cpf', 'phone', 'createdAt'] as const;
    const lines = [
      cols.join(','),
      ...users.map((u) =>
        cols.map((h) => csvEscape(u[h])).join(',')
      ),
    ];
    return new NextResponse('\uFEFF' + lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="macofel-users-${Date.now()}.csv"`,
      },
    });
  }

  const orders = await prisma.order.findMany({
    take: MAX_ROWS,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      user: { select: { email: true } },
    },
  });

  const flat = orders.map((o) => ({
    orderId: o.id,
    userId: o.userId,
    userEmail: o.user?.email ?? '',
    status: o.status,
    total: o.total,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    createdAt: o.createdAt.toISOString(),
    itemsCount: o.items.length,
  }));

  await writeAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    action: 'export.generated',
    targetType: 'export',
    metadata: { type: 'orders', format, rowCount: flat.length },
  });

  if (format === 'json') {
    return new NextResponse(JSON.stringify(flat, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="macofel-orders-${Date.now()}.json"`,
      },
    });
  }

  const ocols = [
    'orderId',
    'userId',
    'userEmail',
    'status',
    'total',
    'customerName',
    'customerEmail',
    'createdAt',
    'itemsCount',
  ] as const;
  const lines = [
    ocols.join(','),
    ...flat.map((row) => ocols.map((h) => csvEscape(row[h])).join(',')),
  ];
  return new NextResponse('\uFEFF' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="macofel-orders-${Date.now()}.csv"`,
    },
  });
}
