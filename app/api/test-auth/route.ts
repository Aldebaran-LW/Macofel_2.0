// Endpoint de teste para verificar autenticação
// Acesse: /api/test-auth?email=admin@macofel.com&password=admin123

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Testar conexão com banco
    let dbConnected = false;
    try {
      await prisma.$connect();
      dbConnected = true;
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Erro de conexão com banco',
        details: error.message,
        dbConnected: false,
      });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado',
        email,
        dbConnected: true,
        userExists: false,
      });
    }

    if (!user.password) {
      return NextResponse.json({
        success: false,
        error: 'Usuário sem senha',
        email,
        dbConnected: true,
        userExists: true,
        hasPassword: false,
      });
    }

    // Verificar senha
    const isCorrectPassword = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      success: isCorrectPassword,
      error: isCorrectPassword ? null : 'Senha incorreta',
      email,
      dbConnected: true,
      userExists: true,
      hasPassword: true,
      passwordCorrect: isCorrectPassword,
      user: isCorrectPassword
        ? {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
