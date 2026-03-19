import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { isValidCpf, normalizeCpf } from '@/lib/cpf';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // `req.json()` pode falhar se o body chegar vazio/mal formatado.
    // Para facilitar debug (dev), lemos como texto primeiro.
    const raw = await req.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch (e: any) {
      return NextResponse.json(
        {
          error: 'JSON inválido no body',
          details: e?.message ?? 'Falha ao fazer parse do JSON',
          raw: process.env.NODE_ENV === 'development' ? raw?.slice(0, 300) : undefined,
        },
        { status: 400 }
      );
    }
    const { email, password, firstName, lastName, phone, address, cpf } = body;

    if (!email || !password || !firstName || !lastName || !cpf) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando (incluindo CPF)' },
        { status: 400 }
      );
    }

    const cpfClean = normalizeCpf(String(cpf));
    if (!isValidCpf(cpfClean)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    const existingCpf = await prisma.user.findFirst({
      where: { cpf: cpfClean },
      select: { id: true },
    });

    if (existingCpf) {
      return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        cpf: cpfClean,
        phone: phone ?? null,
        address: address ?? null,
        role: 'CLIENT',
      },
    });

    return NextResponse.json(
      {
        message: 'Cadastro realizado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro no cadastro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
