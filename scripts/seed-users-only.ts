// Script para criar apenas os usuários no banco de dados Supabase
// Execute: npx tsx --require dotenv/config scripts/seed-users-only.ts

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
  console.log('🌱 Criando usuários no banco de dados...\n');

  try {
    // Verificar se os usuários já existem
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@macofel.com' },
    });

    const existingClient = await prisma.user.findUnique({
      where: { email: 'cliente@teste.com' },
    });

    if (existingAdmin) {
      console.log('⚠️  Usuário admin@macofel.com já existe. Pulando...');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@macofel.com',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'MACOFEL',
          phone: '(11) 3333-3333',
          address: 'Sede MACOFEL - São Paulo/SP',
          role: 'ADMIN',
        },
      });
      console.log('✅ Usuário admin@macofel.com criado');
    }

    if (existingClient) {
      console.log('⚠️  Usuário cliente@teste.com já existe. Pulando...');
    } else {
      const hashedPassword = await bcrypt.hash('cliente123', 10);
      await prisma.user.create({
        data: {
          email: 'cliente@teste.com',
          password: hashedPassword,
          firstName: 'Cliente',
          lastName: 'Teste',
          phone: '(11) 99999-9999',
          address: 'Rua Teste, 123 - São Paulo/SP',
          role: 'CLIENT',
        },
      });
      console.log('✅ Usuário cliente@teste.com criado');
    }

    console.log('\n🎉 Usuários verificados/criados com sucesso!');
    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Admin: admin@macofel.com / admin123');
    console.log('   Cliente: cliente@teste.com / cliente123');
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
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
