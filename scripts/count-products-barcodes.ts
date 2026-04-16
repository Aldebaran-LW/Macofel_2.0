/**
 * Conta produtos na coleção `products` (Mongo `test`) com código de barras e quantos
 * passam na validação GS1 (`normalizeValidGtin`: comprimento + dígito de controlo).
 *
 *   npx tsx --require dotenv/config scripts/count-products-barcodes.ts
 */
import { connectToDatabase, disconnectMongoNativeClient } from '../lib/mongodb-native';
import { normalizeValidGtin } from '../lib/gtin-validate';

function barcodeString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  return String(raw).trim();
}

async function run(): Promise<void> {
  const db = await connectToDatabase();
  const col = db.collection('products');

  let total = 0;
  let comCodigoBarras = 0;
  let gtinValido = 0;
  let ativosTotal = 0;
  let ativosComBarra = 0;
  let ativosGtinValido = 0;

  const cursor = col.find({}, { projection: { codBarra: 1, status: 1 } }).batchSize(500);

  for await (const doc of cursor) {
    total++;
    const ativo = doc.status === true;
    if (ativo) ativosTotal++;

    const s = barcodeString(doc.codBarra);
    if (!s) continue;
    comCodigoBarras++;
    if (ativo) ativosComBarra++;

    if (normalizeValidGtin(s)) {
      gtinValido++;
      if (ativo) ativosGtinValido++;
    }
  }

  const invalidos = comCodigoBarras - gtinValido;
  const semBarra = total - comCodigoBarras;

  console.log('--- Catálogo Mongo (`products`) ---');
  console.log(`Total de documentos:     ${total}`);
  console.log(`Com código de barras:    ${comCodigoBarras} (${pct(comCodigoBarras, total)} do total)`);
  console.log(`  └─ GTIN/EAN válido:     ${gtinValido} (${pct(gtinValido, total)} do total, ${pct(gtinValido, comCodigoBarras)} dos que têm barra)`);
  console.log(`  └─ Com barra inválida:  ${invalidos} (formato/checksum)`);
  console.log(`Sem código de barras:    ${semBarra}`);
  console.log('');
  console.log('--- Apenas produtos ativos (status === true) ---');
  console.log(`Ativos (total):          ${ativosTotal}`);
  console.log(`Ativos com barra:        ${ativosComBarra}`);
  console.log(`Ativos com GTIN válido:  ${ativosGtinValido}`);
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '0%';
  return `${((100 * part) / whole).toFixed(1)}%`;
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
