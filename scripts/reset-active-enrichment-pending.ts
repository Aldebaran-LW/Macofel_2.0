/**
 * Repõe produtos ativos com `enrichmentStatus: 'pending'` (fila Gemini ativos).
 * Útil após `catalog:enrich-active-ean` ter marcado muitos à pressa.
 *
 *   npx tsx --require dotenv/config scripts/reset-active-enrichment-pending.ts
 *   npx tsx --require dotenv/config scripts/reset-active-enrichment-pending.ts --yes
 */
import { connectToDatabase, disconnectMongoNativeClient } from '../lib/mongodb-native';

async function main(): Promise<void> {
  const yes = process.argv.includes('--yes');
  const db = await connectToDatabase();
  const col = db.collection('products');
  const filter = { status: true, enrichmentStatus: 'pending' as const };
  const n = await col.countDocuments(filter);
  console.log(`Produtos ativos com enrichmentStatus=pending: ${n}`);
  if (!yes) {
    console.log('Dry-run. Para aplicar: acrescente --yes');
    return;
  }
  const r = await col.updateMany(filter, {
    $unset: { enrichmentStatus: '' },
    $set: { updatedAt: new Date() },
  });
  console.log('updateMany:', { matchedCount: r.matchedCount, modifiedCount: r.modifiedCount });
}

void (async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await disconnectMongoNativeClient();
  }
})();
