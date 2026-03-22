import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import prisma from '@/lib/db';
import { isValidCpf, normalizeCpf } from '@/lib/cpf';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id, role: 'CLIENT' },
    });

    if (!user) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      cpf,
    } = body ?? {};

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Nome, sobrenome e email são obrigatórios' },
        { status: 400 }
      );
    }

    let cpfClean: string | null;
    if (cpf != null && String(cpf).trim() !== '') {
      cpfClean = normalizeCpf(String(cpf));
      if (!isValidCpf(cpfClean)) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }
    } else {
      cpfClean = user.cpf ?? null;
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (emailNorm !== user.email.toLowerCase()) {
      const taken = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (taken) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
    }

    if (cpfClean) {
      const takenCpf = await prisma.user.findFirst({
        where: { cpf: cpfClean, NOT: { id } },
        select: { id: true },
      });
      if (takenCpf) {
        return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {
      email: emailNorm,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
      address: address != null && String(address).trim() !== '' ? String(address).trim() : null,
      cpf: cpfClean,
    };

    if (password != null && String(password).trim() !== '') {
      if (String(password).length < 6) {
        return NextResponse.json(
          { error: 'Senha deve ter no mínimo 6 caracteres' },
          { status: 400 }
        );
      }
      data.password = await bcrypt.hash(String(password), 10);
    }

    await prisma.user.update({
      where: { id },
      data: data as any,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id, role: 'CLIENT' },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
  }
}
