/**
 * Gera CSVs de produtos ativos (mesma noção da vitrine) com código de barras.
 *
 * - **EAN “correspondente ao produto”** no sentido do projeto = `ean_web_match: "ok"`
 *   (EAN com checksum GS1 + encontrado na web + coerência Gemini com nome/descrição da loja).
 * - **GTIN válido (estrutural)** = `normalizeValidGtin(codBarra)` — não prova que o código é deste item.
 *
 * Saída (pasta `reports/`, criada se não existir):
 *   - `produtos-ativos-gtin-valido-todos.csv` — ativo + GTIN válido (todas as colunas, igual às listas A/B)
 *   - `produtos-ativos-gtin-valido-todos-simples.csv` — mesma lista, sem slug / ean_web_match / enrichment*
 *   - `produtos-ativos-ean-confirmado-pipeline.csv` — ativo + GTIN válido + ean_web_match === ok
 *   - `produtos-ativos-ean-gtin-valido-nao-confirmado.csv` — ativo + GTIN válido + ean_web_match !== ok (ou ausente)
 *   - `produtos-ativos-barra-invalida-checksum.csv` — ativo + codBarra preenchido + checksum inválido
 *
 * Uso:
 *   npm run catalog:list-ean-reports
 *   npm run catalog:list-ean-reports:relatorio   → grava em ./docs/relatorio
 *   npx tsx --require dotenv/config scripts/list-active-ean-products.ts --out ./meus-relatorios
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToDatabase, disconnectMongoNativeClient, isInactiveProductStatus } from '../lib/mongodb-native';
import { normalizeValidGtin } from '../lib/gtin-validate';

type Row = Record<string, string>;

function barcodeString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  return String(raw).trim();
}

function csvEscape(value: string): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath: string, headers: string[], rows: Row[]): void {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf8');
}

function argOutDir(): string {
  const i = process.argv.indexOf('--out');
  if (i >= 0 && process.argv[i + 1]) return path.resolve(process.argv[i + 1]);
  return path.join(process.cwd(), 'reports');
}

async function run(): Promise<void> {
  const outDir = argOutDir();
  fs.mkdirSync(outDir, { recursive: true });

  const db = await connectToDatabase();
  const col = db.collection('products');

  const confirmed: Row[] = [];
  const validNotConfirmed: Row[] = [];
  const invalidChecksum: Row[] = [];

  let scanned = 0;
  let skippedInactive = 0;

  const cursor = col
    .find(
      { codBarra: { $exists: true, $nin: [null, ''] } },
      {
        projection: {
          name: 1,
          slug: 1,
          codigo: 1,
          codBarra: 1,
          marca: 1,
          status: 1,
          ean_web_match: 1,
          enrichmentStatus: 1,
          enrichment_notes: 1,
        },
      }
    )
    .batchSize(500);

  for await (const doc of cursor) {
    scanned++;
    if (isInactiveProductStatus((doc as { status?: unknown }).status)) {
      skippedInactive++;
      continue;
    }

    const rawBar = barcodeString((doc as { codBarra?: unknown }).codBarra);
    const gtin = normalizeValidGtin(rawBar);
    const eanMatch = String((doc as { ean_web_match?: unknown }).ean_web_match ?? '').trim();
    const row: Row = {
      codigo: String((doc as { codigo?: unknown }).codigo ?? ''),
      slug: String((doc as { slug?: unknown }).slug ?? ''),
      name: String((doc as { name?: unknown }).name ?? ''),
      marca: String((doc as { marca?: unknown }).marca ?? ''),
      codBarra_cadastro: rawBar,
      ean_gs1_normalizado: gtin ?? '',
      ean_web_match: eanMatch || '(sem campo)',
      enrichmentStatus: String((doc as { enrichmentStatus?: unknown }).enrichmentStatus ?? ''),
      enrichment_notes: String((doc as { enrichment_notes?: unknown }).enrichment_notes ?? '').slice(0, 500),
    };

    if (!gtin) {
      invalidChecksum.push(row);
      continue;
    }

    if (eanMatch === 'ok') {
      confirmed.push(row);
    } else {
      validNotConfirmed.push(row);
    }
  }

  const headers = [
    'codigo',
    'slug',
    'name',
    'marca',
    'codBarra_cadastro',
    'ean_gs1_normalizado',
    'ean_web_match',
    'enrichmentStatus',
    'enrichment_notes',
  ];
  const headersBasico = headers.filter(
    (h) => !['slug', 'ean_web_match', 'enrichmentStatus', 'enrichment_notes'].includes(h)
  );

  const allValidGtin = [...confirmed, ...validNotConfirmed];
  const f0 = path.join(outDir, 'produtos-ativos-gtin-valido-todos.csv');
  const f0s = path.join(outDir, 'produtos-ativos-gtin-valido-todos-simples.csv');
  const f1 = path.join(outDir, 'produtos-ativos-ean-confirmado-pipeline.csv');
  const f2 = path.join(outDir, 'produtos-ativos-ean-gtin-valido-nao-confirmado.csv');
  const f3 = path.join(outDir, 'produtos-ativos-barra-invalida-checksum.csv');

  writeCsv(f0, headers, allValidGtin);
  writeCsv(f0s, headersBasico, allValidGtin);
  writeCsv(f1, headers, confirmed);
  writeCsv(f2, headers, validNotConfirmed);
  writeCsv(f3, headers, invalidChecksum);

  console.log('--- Relatório EAN / GTIN (produtos ativos na vitrine) ---');
  console.log(`Documentos com codBarra preenchido (varredura): ${scanned}`);
  console.log(`Ignorados (inativos / fora da vitrine):        ${skippedInactive}`);
  console.log('');
  console.log(`0) Ativos com GTIN válido (checksum) — lista única A+B: ${allValidGtin.length}`);
  console.log(`   → ${f0}`);
  console.log(`   → ${f0s} (cópia sem slug / ean_web_match / enrichment*)`);
  console.log(`A) EAN confirmado pelo pipeline (ean_web_match=ok): ${confirmed.length}`);
  console.log(`   → ${f1}`);
  console.log(`B) GTIN válido (checksum) mas NÃO confirmado:       ${validNotConfirmed.length}`);
  console.log(`   → ${f2}`);
  console.log(`C) Código preenchido mas checksum GS1 inválido:   ${invalidChecksum.length}`);
  console.log(`   → ${f3}`);
  console.log('');
  console.log(
    'Nota: só a lista A garante “EAN corresponde ao produto” no sentido usado no enriquecimento (web + coerência).'
  );
  console.log('      A lista B inclui quem nunca passou pelo pipeline ou ficou no_listing / api_incomplete / incoherent.');
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
