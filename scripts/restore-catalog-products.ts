/**
 * Restaura produtos a partir de um JSON gerado por archive-catalog-products.ts
 *
 * Uso:
 *   npx tsx --require dotenv/config scripts/restore-catalog-products.ts
 *   npx tsx --require dotenv/config scripts/restore-catalog-products.ts temp/catalog-backup-....json
 *
 * Se já existirem produtos, falha (use ALLOW_RESTORE_OVERWRITE=sim para inserir na mesma).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { isAbsolute, join } from 'path';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb-native';

type BackupPayload = {
  version: number;
  products: Array<Record<string, unknown>>;
};

function pickLatestBackup(tempDir: string): string | null {
  let files: string[];
  try {
    files = readdirSync(tempDir).filter((f) => f.startsWith('catalog-backup-') && f.endsWith('.json'));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  const scored = files.map((f) => {
    const p = join(tempDir, f);
    return { f: p, m: statSync(p).mtimeMs };
  });
  scored.sort((a, b) => b.m - a.m);
  return scored[0].f;
}

async function main() {
  const root = join(__dirname, '..');
  const tempDir = join(root, 'temp');
  const argPath = process.argv[2];
  const backupPath = argPath
    ? isAbsolute(argPath)
      ? argPath
      : join(root, argPath.replace(/^\//, ''))
    : pickLatestBackup(tempDir);

  if (!backupPath || !existsSync(backupPath)) {
    console.error('Nenhum backup encontrado em temp/. Rode o archive primeiro ou passe o caminho do .json.');
    process.exit(1);
  }

  const raw = readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw) as BackupPayload;
  if (!data.products || !Array.isArray(data.products)) {
    console.error('Ficheiro inválido: falta array "products".');
    process.exit(1);
  }

  const db = await connectToDatabase();
  const productsCol = db.collection('products');
  const existing = await productsCol.countDocuments({});
  if (existing > 0 && process.env.ALLOW_RESTORE_OVERWRITE !== 'sim') {
    console.error(
      `Já existem ${existing} produto(s). Para inserir o backup na mesma (pode duplicar slugs e falhar), use:\n` +
        'ALLOW_RESTORE_OVERWRITE=sim npx tsx --require dotenv/config scripts/restore-catalog-products.ts ' +
        (argPath ?? '')
    );
    process.exit(1);
  }

  const docs = data.products.map((p) => {
    const { _id, categoryId, createdAt, updatedAt, ...rest } = p;
    return {
      ...rest,
      _id: new ObjectId(String(_id)),
      categoryId: new ObjectId(String(categoryId)),
      createdAt: createdAt ? new Date(String(createdAt)) : new Date(),
      updatedAt: updatedAt ? new Date(String(updatedAt)) : new Date(),
    };
  });

  if (docs.length === 0) {
    console.log('Backup não contém produtos — nada a inserir.');
    return;
  }

  if (process.env.ALLOW_RESTORE_OVERWRITE === 'sim' && existing > 0) {
    await productsCol.deleteMany({});
    console.log(`Removidos ${existing} produto(s) existentes antes da restauração.`);
  }

  const ins = await productsCol.insertMany(docs as any);
  console.log(`\n✅ Restaurados ${ins.insertedCount} produto(s) a partir de:\n   ${backupPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
