/**
 * Teste local do enriquecimento AI Studio (Gemini + schema JSON).
 * Não grava Mongo; não usa MACOFEL_ENRICH_API_KEY.
 *
 *   npx tsx --require dotenv/config scripts/test-ai-studio-enrich-local.ts
 */
import {
  CATALOG_AGENT_GEMINI_MODEL,
  GEMINI_API_KEY,
  GEMINI_ENRICH_MODEL,
} from '../env';
import { enrichProductWithGemini } from '../lib/macofel-ai-studio-enrichment';

async function main(): Promise<void> {
  if (!GEMINI_API_KEY?.trim()) {
    console.error('GEMINI_API_KEY em falta no .env');
    process.exitCode = 2;
    return;
  }

  const model =
    GEMINI_ENRICH_MODEL ||
    CATALOG_AGENT_GEMINI_MODEL?.trim() ||
    'gemini-2.0-flash';
  console.log(
    'Modelo:',
    model,
    GEMINI_ENRICH_MODEL ? '(GEMINI_ENRICH_MODEL)' : '(CATALOG_AGENT_GEMINI_MODEL ou padrão)'
  );
  console.log('A chamar Gemini (pode demorar ~10–40s)…\n');
  const out = await enrichProductWithGemini({
    productId: 'local-test',
    name: 'Martelo Unha 27mm Cabo de Fibra',
    codigo: 'TRM-123',
    marca: 'Tramontina',
    codBarra: '7891114001234',
    description: 'Martelo resistente para uso geral.',
    categoryHint: 'ferramentas',
    referenceUrls: ['https://www.tramontina.com.br/'],
  });

  console.log(JSON.stringify(out, null, 2));
  console.log('\nOK — palavras na descrição:', out.description.trim().split(/\s+/).filter(Boolean).length);
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
