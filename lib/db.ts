// Cliente Prisma para PostgreSQL (Supabase) - Branch main
// @ts-ignore - Cliente gerado dinamicamente
import { PrismaClient as PostgresPrismaClient } from '../.prisma/postgres-client';

const globalForPrisma = globalThis as unknown as {
  prisma: PostgresPrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PostgresPrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Prisma Client mantém conexão automaticamente
// Não precisa chamar $connect() manualmente

export default prisma;
