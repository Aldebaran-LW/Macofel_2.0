/**
 * Teste local (sem auth): chama o serviço de enriquecimento e, opcionalmente, Mongo.
 *
 * Uso:
 *   npx tsx --require dotenv/config scripts/test-enrichment-local.ts "nome do produto"
 *   npx tsx --require dotenv/config scripts/test-enrichment-local.ts "nome" <productObjectId>
 */
import { getBuscarProdutoInfo } from '../lib/buscar-produto-service';
import { enrichExistingProductIfSparse } from '../lib/product-web-enrichment';
import { disconnectMongoNativeClient } from '../lib/mongodb-native';

async function run(): Promise<void> {
  const q = process.argv[2]?.trim();
  const productId = process.argv[3]?.trim();
  if (!q) {
    console.error('Uso: npx tsx --require dotenv/config scripts/test-enrichment-local.ts "<query>" [productId]');
    process.exitCode = 1;
    return;
  }

  console.log('--- getBuscarProdutoInfo ---');
  const info = await getBuscarProdutoInfo(q);
  if (info) {
    console.log(JSON.stringify(info, null, 2));
  } else {
    const googleOk = Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID);
    const geminiOk = Boolean(process.env.GEMINI_API_KEY);
    if (!googleOk || !geminiOk) {
      console.log(
        'null — enriquecimento Google+Gemini desativado: defina GOOGLE_API_KEY, GOOGLE_CSE_ID e GEMINI_API_KEY no .env.'
      );
    } else {
      console.log(
        'null — APIs configuradas, mas sem resultado útil (Mercado Livre sem match ou falha de rede / quota).'
      );
    }
  }

  if (productId) {
    console.log('\n--- enrichExistingProductIfSparse ---');
    const r = await enrichExistingProductIfSparse(productId, q);
    console.log(JSON.stringify(r, null, 2));
  }
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
