/**
 * Copia coleções MongoDB entre duas connection strings (ex.: local → remoto).
 *
 * Variáveis de ambiente:
 *   MONGODB_SYNC_TARGET — URI de destino (obrigatória): Atlas / produção
 *   Origem (uma delas):
 *     MONGODB_SYNC_SOURCE — URI de origem explícita, ou
 *     MONGODB_URI — usada como origem se MONGODB_SYNC_SOURCE não existir (típico no .env.local)
 *
 *   Alternativa ao destino: MONGODB_URI_REMOTE (se MONGODB_SYNC_TARGET estiver vazio)
 *
 * Opcional:
 *   MONGODB_SYNC_COLLECTIONS — lista separada por vírgula (default: products,categories)
 *
 * Flags:
 *   --dry-run — só mostra contagens, não grava
 *
 * Exemplo (PowerShell):
 *   $env:MONGODB_SYNC_SOURCE="mongodb://127.0.0.1:27017/test"
 *   $env:MONGODB_SYNC_TARGET="mongodb+srv://user:pass@cluster/test?..."
 * Carrega `.env` e `.env.local` (este último prevalece).
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient } from 'mongodb';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

function ensureDatabaseName(uri: string): string {
  if (!uri) return uri;
  if (uri.includes('/?') || uri.match(/mongodb\+srv:\/\/[^/]+\?/)) {
    return uri.replace(/\?/, '/test?');
  }
  return uri;
}

/** Nome da BD no path da URI; alinha ao que o driver usa (ex.: /test, /macofel). */
function getDbNameFromUri(uri: string): string {
  const u = ensureDatabaseName(uri);
  const base = u.split('?')[0];
  const slash = base.lastIndexOf('/');
  if (slash <= 0 || slash >= base.length - 1) return 'test';
  const segment = base.slice(slash + 1);
  if (!segment || segment.includes('@')) return 'test';
  return segment;
}

const DEFAULT_COLLECTIONS = ['products', 'categories'] as const;

function parseArgs(): { dryRun: boolean; collections: string[] } {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const colArg = argv.find((a) => a.startsWith('--collections='));
  const collections = colArg
    ? colArg
        .split('=')[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [...DEFAULT_COLLECTIONS];
  return { dryRun, collections };
}

async function syncCollection(
  sourceDb: ReturnType<MongoClient['db']>,
  targetDb: ReturnType<MongoClient['db']>,
  name: string,
  dryRun: boolean
): Promise<{ copied: number }> {
  const src = sourceDb.collection(name);
  const tgt = targetDb.collection(name);
  const count = await src.countDocuments();
  if (dryRun) {
    console.log(`  [dry-run] ${name}: ${count} documentos na origem`);
    return { copied: 0 };
  }
  const docs = await src.find({}).toArray();
  await tgt.deleteMany({});
  if (docs.length === 0) {
    console.log(`  ${name}: origem vazia — destino limpo`);
    return { copied: 0 };
  }
  const batch = 500;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += batch) {
    const chunk = docs.slice(i, i + batch);
    await tgt.insertMany(chunk, { ordered: false });
    inserted += chunk.length;
  }
  console.log(`  ${name}: ${inserted} documentos copiados`);
  return { copied: inserted };
}

function resolveSyncUris(): { source: string; target: string } {
  const source = (
    process.env.MONGODB_SYNC_SOURCE ||
    process.env.MONGODB_URI ||
    ''
  ).trim();
  const target = (
    process.env.MONGODB_SYNC_TARGET ||
    process.env.MONGODB_URI_REMOTE ||
    ''
  ).trim();
  return { source, target };
}

async function main() {
  const { dryRun, collections } = parseArgs();
  const { source: rawSource, target: rawTarget } = resolveSyncUris();
  const sourceUri = ensureDatabaseName(rawSource);
  const targetUri = ensureDatabaseName(rawTarget);

  if (!sourceUri || !targetUri) {
    console.error(
      'Falta URI de origem ou destino.\n' +
        '  • Destino (obrigatório): MONGODB_SYNC_TARGET ou MONGODB_URI_REMOTE\n' +
        '  • Origem: MONGODB_SYNC_SOURCE ou MONGODB_URI (no .env.local)\n' +
        'Exemplo no .env.local:\n' +
        '  MONGODB_URI=mongodb://127.0.0.1:27017/test\n' +
        '  MONGODB_SYNC_TARGET=mongodb+srv://user:pass@cluster/test?retryWrites=true&w=majority'
    );
    process.exit(1);
  }
  if (sourceUri === targetUri) {
    console.error('Origem e destino são iguais — abortado.');
    process.exit(1);
  }

  const sourceDbName = getDbNameFromUri(sourceUri);
  const targetDbName = getDbNameFromUri(targetUri);
  console.log(
    JSON.stringify(
      {
        dryRun,
        collections,
        sourceDb: sourceDbName,
        targetDb: targetDbName,
      },
      null,
      2
    )
  );

  const sourceClient = new MongoClient(sourceUri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
  });
  const targetClient = new MongoClient(targetUri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
  });

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);

  try {
    for (const col of collections) {
      await syncCollection(sourceDb, targetDb, col, dryRun);
    }
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }

  if (dryRun) {
    console.log('\nRemova --dry-run para copiar de facto.');
  } else {
    console.log('\nConcluído. Índices: o Atlas pode recriar índices automaticamente em alguns casos; se notares lentidão, confere índices nas coleções no UI do Atlas.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
