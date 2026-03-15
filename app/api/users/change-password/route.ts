import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const userId = (session.user as any)?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const isCorrectPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCorrectPassword) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json(
      { error: 'Erro ao alterar senha' },
      { status: 500 }
    );
  }
}
