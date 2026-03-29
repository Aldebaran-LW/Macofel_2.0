// Cliente Prisma para MongoDB (Produtos e Categorias)

// Função para garantir que a connection string tenha nome do banco
function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  
  // Se a URI não tem nome do banco (termina com /? ou apenas ?), adiciona /test
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    // Adiciona /test antes do ?
    return uri.replace(/\?/, '/test?');
  }
  // Se já tem nome do banco, retorna como está
  return uri;
}

// Obter MONGODB_URI e garantir que tenha nome do banco ANTES de importar o Prisma Client
const originalMongoUri = process.env.MONGODB_URI || '';
const mongoUriWithDb = ensureDatabaseName(originalMongoUri);

// Sobrescrever a variável de ambiente para o Prisma Client usar
if (mongoUriWithDb !== originalMongoUri) {
  process.env.MONGODB_URI = mongoUriWithDb;
}

// @ts-ignore - Cliente gerado dinamicamente
import { PrismaClient as MongoPrismaClient } from '../node_modules/.prisma-mongodb';

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
