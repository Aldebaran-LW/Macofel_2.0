// Cliente Prisma para MongoDB (Produtos e Categorias)
// @ts-ignore - Cliente gerado dinamicamente
import { PrismaClient as MongoPrismaClient } from '../.prisma/mongodb-client';

const globalForMongo = globalThis as unknown as {
  mongoPrisma: MongoPrismaClient | undefined;
};

export const mongoPrisma =
  globalForMongo.mongoPrisma ??
  new MongoPrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForMongo.mongoPrisma = mongoPrisma;

export default mongoPrisma;
