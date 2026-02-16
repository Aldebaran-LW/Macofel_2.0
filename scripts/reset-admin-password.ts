// Script para resetar a senha do admin no banco de dados Supabase
// Execute: npx tsx --require dotenv/config scripts/reset-admin-password.ts

import { PrismaClient as PostgresPrismaClient } from '../.prisma/postgres-client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PostgresPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔐 Resetando senha do admin...\n');

  try {
    const email = 'admin@macofel.com';
    const newPassword = 'admin123';

    // Gerar novo hash da senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha do usuário
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log('✅ Senha do admin resetada com sucesso!');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Senha: ${newPassword}`);
    console.log('\n🔑 Credenciais atualizadas:');
    console.log('   Admin: admin@macofel.com / admin123');
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error('❌ Usuário não encontrado. Execute primeiro: npm run seed-users');
    } else {
      console.error('❌ Erro ao resetar senha:', error);
    }
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
