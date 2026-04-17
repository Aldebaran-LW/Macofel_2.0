/**
 * Teste local do enriquecimento de catálogo (Gemini + fila `enrichmentStatus`).
 *
 *   npx tsx --require dotenv/config scripts/test-catalog-enrichment-one.ts
 *
 * Requer: MONGODB_URI (ou equivalente do projeto) e GEMINI_API_KEY.
 */
import { GEMINI_API_KEY } from '../env';
import { connectToDatabase, disconnectMongoNativeClient } from '../lib/mongodb-native';
import {
  enrichActiveCatalogPendingProducts,
  markActiveProductsForShortDescriptionEnrichment,
} from '../lib/catalog-active-enrich-queue';

async function run(): Promise<void> {
  if (!GEMINI_API_KEY?.trim()) {
    console.error('GEMINI_API_KEY não definida no ambiente — impossível chamar o Gemini.');
    process.exitCode = 2;
    return;
  }

  console.log('1) Marcar produtos ativos (descrição curta + EAN válido) como pending…');
  const marked = await markActiveProductsForShortDescriptionEnrichment({ maxToMark: 5 });
  console.log('   Marcados:', marked);

  console.log('2) Processar até 1 produto da fila (status ativo, enrichmentStatus=pending)…');
  const r = await enrichActiveCatalogPendingProducts({ limit: 1, chain: false });
  console.log('   Lote:', r);

  const db = await connectToDatabase();
  const sample = await db
    .collection('products')
    .find({ enrichmentStatus: { $exists: true, $ne: null } })
    .project({ name: 1, enrichmentStatus: 1, enrichment_notes: 1, codBarra: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();

  console.log('3) Últimos documentos com enrichmentStatus (amostra):');
  for (const d of sample) {
    const id = String((d as { _id: unknown })._id);
    const st = (d as { enrichmentStatus?: string }).enrichmentStatus;
    const name = String((d as { name?: string }).name ?? '').slice(0, 48);
    const notes = (d as { enrichment_notes?: string }).enrichment_notes;
    console.log(`   ${id} | ${st} | ${name}${notes ? ` | ${String(notes).slice(0, 72)}` : ''}`);
  }

  if (r.processed === 0) {
    console.log(
      '\nNenhum pending processado. Confirme produtos com status=true, codBarra (GTIN válido) e enrichmentStatus=pending, ou deixe o passo 1 marcar candidatos com descrição curta.'
    );
  }

  console.log('\nConcluído.');
}

void (async () => {
  try {
    await run();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await disconnectMongoNativeClient();
  }
})();
