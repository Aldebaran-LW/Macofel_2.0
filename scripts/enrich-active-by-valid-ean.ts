/**
 * Enfileira produtos ATIVOS com GTIN válido (checksum) para enriquecimento Gemini e processa
 * vários lotes em sequência. Quem falhar fica com `enrichmentStatus: skipped` (ou `failed`),
 * `enrichment_notes` explicativo e `ean_web_match` para filtrar no Mongo.
 *
 *   npx tsx --require dotenv/config scripts/enrich-active-by-valid-ean.ts
 *   npx tsx --require dotenv/config scripts/enrich-active-by-valid-ean.ts --mark 800 --loops 25
 *
 * Requer: MONGODB_URI, GEMINI_API_KEY.
 * EAN na web: por defeito Google CSE+Gemini (GOOGLE_API_KEY + GOOGLE_CSE_ID); quota grátis ~100 pesquisas/dia — cada EAN pode usar até 3.
 *   BARCODE_ENRICHMENT_PROVIDER=abacus + ABACUS_API_KEY → RouteLLM sem CSE.
 *   BARCODE_ENRICHMENT_PROVIDER=gemini_ml_only → só ML+Gemini, sem CSE.
 * Sem Google e sem Abacus: se só existir GEMINI, o serviço usa ML+Gemini automaticamente.
 */
import { GEMINI_API_KEY, MAX_CATALOG_BATCH } from '../env';
import {
  hasBarcodeEanEnrichmentApisConfigured,
  hasBarcodeWebLookupApisConfigured,
  probeGoogleCustomSearchApi,
} from '../lib/buscar-produto-service';
import { disconnectMongoNativeClient } from '../lib/mongodb-native';
import {
  enrichActiveCatalogPendingProducts,
  markActiveProductsForEnrichmentAll,
} from '../lib/catalog-active-enrich-queue';
import { connectToDatabase } from '../lib/mongodb-native';

function parseArg(name: string, def: number): number {
  const idx = process.argv.indexOf(name);
  if (idx < 0 || !process.argv[idx + 1]) return def;
  const n = parseInt(process.argv[idx + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

async function run(): Promise<void> {
  if (!GEMINI_API_KEY?.trim()) {
    console.error('GEMINI_API_KEY não definida.');
    process.exitCode = 2;
    return;
  }

  const webApis = hasBarcodeWebLookupApisConfigured();
  const anyEanBackend = hasBarcodeEanEnrichmentApisConfigured();
  const prov = (process.env.BARCODE_ENRICHMENT_PROVIDER || '').trim().toLowerCase();
  console.log(
    webApis
      ? 'Variáveis GOOGLE_API_KEY + GOOGLE_CSE_ID + GEMINI_API_KEY definidas (CSE ativo para EAN).'
      : prov === 'abacus'
        ? 'Modo BARCODE_ENRICHMENT_PROVIDER=abacus (sem CSE).'
        : prov === 'gemini_ml_only'
          ? 'Modo BARCODE_ENRICHMENT_PROVIDER=gemini_ml_only (sem CSE).'
          : anyEanBackend
            ? 'Sem Google CSE completo; enriquecimento por EAN usa ML+Gemini (sem chamadas Custom Search).'
            : 'AVISO: faltam chaves para enriquecer por EAN (Google+CSE+Gemini, ou ABACUS_API_KEY com BARCODE_ENRICHMENT_PROVIDER=abacus, ou GEMINI para ML só) — risco de ean_web_match: "api_incomplete".'
  );
  if (webApis) {
    const probe = await probeGoogleCustomSearchApi();
    if (!probe.ok) {
      console.warn(
        'AVISO: Custom Search API recusou o pedido de teste (HTTP',
        probe.httpStatus + ').',
        probe.message ? `Google: ${probe.message}` : ''
      );
      console.warn(
        '  → Ative "Custom Search API" no projeto Google Cloud da chave; em Credenciais, a chave tem de poder usar essa API (erro típico: "Requests to this API ... are blocked").'
      );
    } else {
      console.log('   Custom Search API: pedido de teste OK (HTTP', probe.httpStatus + ').');
    }
  }

  const maxMark = parseArg('--mark', 500);
  const maxLoops = parseArg('--loops', 20);

  console.log('1) Marcar ativos com codBarra (GTIN válido) como pending (até', maxMark, ')…');
  const marked = await markActiveProductsForEnrichmentAll({
    maxToMark: maxMark,
    requireValidBarcode: true,
  });
  console.log('   Marcados:', marked);

  let total = 0;
  let loops = 0;
  console.log('2) Processar fila (lotes de até', MAX_CATALOG_BATCH, ', no máximo', maxLoops, 'voltas)…');
  while (loops < maxLoops) {
    loops++;
    const r = await enrichActiveCatalogPendingProducts({
      limit: MAX_CATALOG_BATCH,
      chain: false,
    });
    total += r.processed;
    console.log(`   Volta ${loops}: processados ${r.processed} (acumulado ${total})`);
    if (r.processed === 0) break;
  }

  const db = await connectToDatabase();
  const col = db.collection('products');
  const [ok, noListing, apiIncomplete, incoherent, invalid, failed] = await Promise.all([
    col.countDocuments({ status: true, ean_web_match: 'ok' }),
    col.countDocuments({ status: true, ean_web_match: 'no_listing' }),
    col.countDocuments({ status: true, ean_web_match: 'api_incomplete' }),
    col.countDocuments({ status: true, ean_web_match: 'incoherent' }),
    col.countDocuments({ status: true, ean_web_match: 'invalid_checksum' }),
    col.countDocuments({ status: true, enrichmentStatus: 'failed' }),
  ]);

  console.log('\n3) Resumo ativos com `ean_web_match` (após esta corrida):');
  console.log('   ok (web alinhada):     ', ok);
  console.log('   no_listing (suspeito): ', noListing, '← GTIN válido, APIs OK, mas sem anúncio com EAN');
  console.log(
    '   api_incomplete:        ',
    apiIncomplete,
    '← falta Google CSE (ou só ML não achou); configure .env e reenfileire'
  );
  console.log('   incoherent (suspeito): ', incoherent, '← título web ≠ nome loja; verificar EAN');
  console.log('   invalid_checksum:    ', invalid);
  console.log('   enrichment failed:   ', failed);
  console.log(
    '\nConsultas úteis no Mongo: { status: true, ean_web_match: "no_listing" } | { status: true, ean_web_match: "api_incomplete" }'
  );
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
