/**
 * Carrega .env e .env.local e corre o Prisma CLI para o schema Postgres.
 * Garante DIRECT_URL (obrigatório no schema): copia DATABASE_URL se faltar.
 * Lê DATABASE_URL dos ficheiros linha-a-linha se dotenv não preencher (ex.: formato inesperado).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function parseEnvValue(filePath, key) {
  if (!existsSync(filePath)) return '';
  const text = readFileSync(filePath, 'utf8');
  const re = new RegExp(`^(?:export\\s+)?${key}\\s*=\\s*(.+)$`);
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(re);
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v.trim();
  }
  return '';
}

config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local'), override: true });

const envLocal = resolve(root, '.env.local');
const envFile = resolve(root, '.env');

let databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  parseEnvValue(envLocal, 'DATABASE_URL') ||
  parseEnvValue(envFile, 'DATABASE_URL');

let directUrl =
  process.env.DIRECT_URL?.trim() ||
  parseEnvValue(envLocal, 'DIRECT_URL') ||
  parseEnvValue(envFile, 'DIRECT_URL');

if (!directUrl && databaseUrl) {
  directUrl = databaseUrl;
  console.warn(
    '[prisma-postgres] DIRECT_URL não definido — a usar o mesmo valor que DATABASE_URL.\n' +
      '  Com Supabase pooler (6543) em DATABASE_URL, define DIRECT_URL com a ligação direta (:5432).'
  );
}

if (!databaseUrl || !directUrl) {
  const hasEnv = existsSync(envFile);
  const hasLocal = existsSync(envLocal);
  console.error('[prisma-postgres] Falta DATABASE_URL (e possivelmente DIRECT_URL) para o Prisma Postgres.');
  console.error(`  Pasta: ${root}`);
  console.error(`  .env existe: ${hasEnv ? 'sim' : 'não'}`);
  console.error(`  .env.local existe: ${hasLocal ? 'sim' : 'não'}`);
  console.error('');
  console.error('  1) Cria ou edita .env.local na raiz do projeto com:');
  console.error('     DATABASE_URL="postgresql://..."');
  console.error('     DIRECT_URL="postgresql://..."   (pode ser igual à DATABASE_URL se não usares pooler)');
  console.error('  2) Modelo: copia env.example para .env.local (PowerShell: Copy-Item env.example .env.local) e edita.');
  console.error('  3) Supabase: DATABASE_URL = pooler :6543; DIRECT_URL = direto :5432 (host db.xxx.supabase.co).');
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error(
    'Uso: node scripts/run-prisma-postgres.mjs <comando prisma> [...]\n' +
      'Ex.: node scripts/run-prisma-postgres.mjs migrate deploy --schema=./prisma/schema-postgres.prisma'
  );
  process.exit(1);
}

const childEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
};

const r = spawnSync('npx', ['prisma', ...prismaArgs], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: childEnv,
});

process.exit(r.status === null ? 1 : r.status);
