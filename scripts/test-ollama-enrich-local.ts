/**
 * Teste de enriquecimento com LLM local (Ollama).
 *
 * Pré-requisitos:
 *   - Instalar Ollama: https://ollama.com
 *   - `ollama serve` (normalmente já em background após instalar)
 *   - `ollama pull llama3.2` (ou o valor de OLLAMA_MODEL no .env)
 *
 *   npx tsx --require dotenv/config scripts/test-ollama-enrich-local.ts
 */
import {
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  OLLAMA_REQUEST_TIMEOUT_MS,
} from '../env';
import { enrichProductWithOllama } from '../lib/ollama-product-enrichment';

async function main(): Promise<void> {
  console.log('Ollama:', OLLAMA_BASE_URL, '| modelo:', OLLAMA_MODEL);
  console.log('Timeout:', OLLAMA_REQUEST_TIMEOUT_MS, 'ms');
  console.log('A gerar (no CPU pode demorar vários minutos)…\n');

  const out = await enrichProductWithOllama({
    productId: 'local-ollama-test',
    name: 'Martelo Unha 27mm Cabo de Fibra',
    codigo: 'TRM-123',
    marca: 'Tramontina',
    codBarra: '7891114001234',
    description: 'Martelo para uso geral em obra.',
    categoryHint: 'ferramentas',
    referenceUrls: [],
  });

  console.log(JSON.stringify(out, null, 2));
  console.log(
    '\nOK — palavras na descrição:',
    out.description.trim().split(/\s+/).filter(Boolean).length
  );
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
