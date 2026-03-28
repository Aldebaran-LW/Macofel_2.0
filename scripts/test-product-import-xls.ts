/**
 * Testa localmente a importação do relatório .xls/.xlsx (mesma lógica que a API admin).
 *
 * Uso:
 *   npm run test:product-import-xls -- "e:/Relatorio de Produtos 2.xls"
 *   IMPORT_LIMIT=50 npm run test:product-import-xls -- "e:/ficheiro.xls"
 *   IMPORT_UPSERT=0 ...   (só criar; ignorar slugs já existentes)
 *
 * Requer MONGODB_URI em .env.local ou .env (igual ao `npm run dev`).
 *
 * Nota: o dotenv corre no início de main() e o Prisma carrega em import() dinâmico,
 * para MONGODB_URI existir antes de `lib/mongodb.ts` ser avaliado.
 *
 * Erro P6001 ("URL must start with prisma://") com mongodb+srv: regenere o cliente:
 *   npm run prisma:generate
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parseRelatorioEstoqueWorkbook } from '../lib/relatorio-estoque-xls';

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function parseArgs(argv: string[]) {
  const out: { filePath: string; limit: number | null; upsert: boolean } = {
    filePath: '',
    limit: null,
    upsert: process.env.IMPORT_UPSERT !== '0' && process.env.IMPORT_UPSERT !== 'false',
  };
  const envLimit = process.env.IMPORT_LIMIT;
  if (envLimit && /^\d+$/.test(envLimit)) {
    out.limit = parseInt(envLimit, 10);
  }
  for (const a of argv) {
    if (a.startsWith('--limit=')) {
      const n = parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) out.limit = n;
      continue;
    }
    if (!a.startsWith('-')) {
      out.filePath = a;
    }
  }
  return out;
}

async function main() {
  const root = process.cwd();
  dotenv.config({ path: path.join(root, '.env') });
  dotenv.config({ path: path.join(root, '.env.local'), override: true });

  const { filePath, limit, upsert } = parseArgs(process.argv.slice(2));
  const resolved = filePath || 'e:/Relatorio de Produtos 2.xls';

  if (!fs.existsSync(resolved)) {
    console.error('Ficheiro não encontrado:', resolved);
    console.error(
      'Indique o caminho: npm run test:product-import-xls -- "e:/Relatorio de Produtos 2.xls"'
    );
    process.exit(1);
  }

  if (!process.env.MONGODB_URI?.trim()) {
    console.error('MONGODB_URI em falta. Copie .env / .env.local com a connection string MongoDB.');
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved);
  const { rows, warnings } = parseRelatorioEstoqueWorkbook(toArrayBuffer(raw));

  console.log('Ficheiro:', resolved);
  console.log('Linhas parseadas:', rows.length);
  if (warnings.length) {
    console.log('Avisos parser:', warnings.slice(0, 10));
    if (warnings.length > 10) console.log(`  ... +${warnings.length - 10} avisos`);
  }

  const slice = limit != null ? rows.slice(0, limit) : rows;
  if (limit != null) {
    console.log(
      `IMPORT_LIMIT=${limit}: a processar ${slice.length} linha(s) (de ${rows.length} no ficheiro).`
    );
  }

  const { runRelatorioProductImport } = await import('../lib/product-relatorio-import');

  const t0 = Date.now();
  const result = await runRelatorioProductImport(slice, { upsert });
  const ms = Date.now() - t0;

  console.log('—');
  console.log('Criados:', result.created);
  console.log('Atualizados:', result.updated);
  console.log('Ignorados:', result.skipped);
  console.log('Erros:', result.errors.length);
  console.log('Tempo:', `${(ms / 1000).toFixed(1)}s`);
  if (result.errors.length) {
    console.log('Primeiros erros:', result.errors.slice(0, 5));
  }

  const m = await import('../lib/mongodb');
  await m.mongoPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
