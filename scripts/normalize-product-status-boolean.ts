/**
 * Converte `products.status` não-booleano para boolean (requisito do Prisma Mongo).
 *
 * Uso (na raiz do projecto):
 *   npx tsx scripts/normalize-product-status-boolean.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function toPrismaBooleanStatus(
  raw: unknown,
  isInactiveProductStatus: (s: unknown) => boolean
): boolean {
  if (raw === true) return true;
  if (raw === false) return false;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return true;
    if (raw === 0) return false;
    return true;
  }
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (t === 'true' || t === '1' || t === 'ativo' || t === 'active') return true;
    if (t === 'false' || t === '0' || t === 'inativo' || t === 'inactive') return false;
    if (isInactiveProductStatus(raw)) return false;
    return true;
  }
  if (raw == null) return true;
  return true;
}

async function main() {
  const { connectToDatabase, isInactiveProductStatus } = await import('../lib/mongodb-native');
  const db = await connectToDatabase();
  const col = db.collection('products');
  const filter = {
    $or: [
      { status: { $type: 'string' } },
      { status: { $type: 'int' } },
      { status: { $type: 'long' } },
      { status: { $type: 'double' } },
      { status: null },
      { status: { $exists: false } },
    ],
  };
  const total = await col.countDocuments(filter);
  console.log(`Documentos a normalizar (aprox.): ${total}`);
  let updated = 0;
  const cursor = col.find(filter);
  for await (const doc of cursor) {
    const b = toPrismaBooleanStatus(doc.status, isInactiveProductStatus);
    if (typeof doc.status === 'boolean' && doc.status === b) continue;
    await col.updateOne({ _id: doc._id }, { $set: { status: b } });
    updated++;
    if (updated % 2000 === 0) console.log(`… ${updated}`);
  }
  console.log(`Concluído. Atualizados: ${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
