/**
 * Define ou altera a senha de um utilizador em `users` (Postgres), com bcrypt.
 * O site (NextAuth) compara com bcrypt — não uses SQL cru com senha em claro.
 *
 * Uso (na raiz do projeto, com DATABASE_URL no .env):
 *   npx tsx --require dotenv/config scripts/set-user-password.ts
 *
 * Variáveis de ambiente (obrigatórias):
 *   MACOFEL_SET_EMAIL=lwdigitalforge@gmail.com
 *   MACOFEL_SET_PASSWORD=a_tua_senha
 */

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
  const email = process.env.MACOFEL_SET_EMAIL?.trim();
  const plain = process.env.MACOFEL_SET_PASSWORD;

  if (!email || !plain) {
    console.error(
      'Defina MACOFEL_SET_EMAIL e MACOFEL_SET_PASSWORD no ambiente (ou num .env local).'
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(plain, 10);

  const updated = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
    select: { id: true, email: true, role: true },
  });

  console.log('Senha atualizada (hash bcrypt gravado em users.password).');
  console.log(`  id: ${updated.id}`);
  console.log(`  email: ${updated.email}`);
  console.log(`  role: ${updated.role}`);
}

main()
  .catch((e: unknown) => {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      console.error('Utilizador não encontrado com esse email. Cria primeiro em /cadastro.');
    } else {
      console.error('Erro:', e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
