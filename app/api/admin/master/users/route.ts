import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireMasterAdminSession } from '@/lib/require-master-admin';

export const dynamic = 'force-dynamic';

/** Lista utilizadores (sem password) — exclusivo Master Admin. */
export async function GET() {
  const auth = await requireMasterAdminSession();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
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
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(users);
}
