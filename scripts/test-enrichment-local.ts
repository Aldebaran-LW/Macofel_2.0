/**
 * Teste local (sem auth): chama o serviço de enriquecimento e, opcionalmente, Mongo.
 *
 * Uso:
 *   npx tsx --require dotenv/config scripts/test-enrichment-local.ts "nome do produto"
 *   npx tsx --require dotenv/config scripts/test-enrichment-local.ts "nome" <productObjectId>
 */
import { getBuscarProdutoInfo } from '../lib/buscar-produto-service';
import { enrichExistingProductIfSparse } from '../lib/product-web-enrichment';

async function main() {
  const q = process.argv[2]?.trim();
  const productId = process.argv[3]?.trim();
  if (!q) {
    console.error('Uso: npx tsx --require dotenv/config scripts/test-enrichment-local.ts "<query>" [productId]');
    process.exit(1);
  }

  console.log('--- getBuscarProdutoInfo ---');
  const info = await getBuscarProdutoInfo(q);
  console.log(info ? JSON.stringify(info, null, 2) : 'null (fontes externas bloqueadas ou sem dados)');

  if (productId) {
    console.log('\n--- enrichExistingProductIfSparse ---');
    const r = await enrichExistingProductIfSparse(productId, q);
    console.log(JSON.stringify(r, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
