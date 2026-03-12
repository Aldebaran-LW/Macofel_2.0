// Cliente Prisma para PostgreSQL/Supabase (Dados Burocráticos)
// @ts-ignore - Cliente gerado dinamicamente
import { PrismaClient as PostgresPrismaClient } from '../.prisma/postgres-client';

const globalForPostgres = globalThis as unknown as {
  postgresPrisma: PostgresPrismaClient | undefined;
};

export const postgresPrisma =
  globalForPostgres.postgresPrisma ??
  new PostgresPrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPostgres.postgresPrisma = postgresPrisma;

export default postgresPrisma;
