/**
 * Exporta todos os produtos (e categorias, para referência) do MongoDB para temp/
 * e REMOVE os documentos da coleção `products` — o site fica sem produtos visíveis.
 *
 * Pasta `temp/` está no .gitignore (não vai para o Git).
 *
 * Uso: npx tsx --require dotenv/config scripts/archive-catalog-products.ts
 *      CONFIRM_ARCHIVE_PRODUCTS=sim npx tsx --require dotenv/config scripts/archive-catalog-products.ts
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb-native';

function serializeProduct(p: Record<string, unknown>) {
  const categoryId = p.categoryId;
  return {
    ...p,
    _id: p._id instanceof ObjectId ? (p._id as ObjectId).toHexString() : String(p._id),
    categoryId:
      categoryId instanceof ObjectId
        ? (categoryId as ObjectId).toHexString()
        : String(categoryId),
    createdAt:
      p.createdAt instanceof Date ? (p.createdAt as Date).toISOString() : p.createdAt,
    updatedAt:
      p.updatedAt instanceof Date ? (p.updatedAt as Date).toISOString() : p.updatedAt,
  };
}

function serializeCategory(c: Record<string, unknown>) {
  return {
    ...c,
    _id: c._id instanceof ObjectId ? (c._id as ObjectId).toHexString() : String(c._id),
    createdAt:
      c.createdAt instanceof Date ? (c.createdAt as Date).toISOString() : c.createdAt,
    updatedAt:
      c.updatedAt instanceof Date ? (c.updatedAt as Date).toISOString() : c.updatedAt,
  };
}

async function main() {
  if (process.env.CONFIRM_ARCHIVE_PRODUCTS !== 'sim') {
    console.error(
      '\nEste comando APAGA todos os produtos do MongoDB após gravar backup em temp/.\n' +
        'Para confirmar: CONFIRM_ARCHIVE_PRODUCTS=sim npx tsx --require dotenv/config scripts/archive-catalog-products.ts\n'
    );
    process.exit(1);
  }

  const root = join(__dirname, '..');
  const tempDir = join(root, 'temp');
  mkdirSync(tempDir, { recursive: true });

  const db = await connectToDatabase();
  const productsCol = db.collection('products');
  const categoriesCol = db.collection('categories');

  const productsRaw = await productsCol.find({}).toArray();
  const categoriesRaw = await categoriesCol.find({}).toArray();

  const exportedAt = new Date().toISOString();
  const safeTs = exportedAt.replace(/[:.]/g, '-');
  const outFile = join(tempDir, `catalog-backup-${safeTs}.json`);

  const payload = {
    version: 1,
    exportedAt,
    note: 'Backup local — pasta temp/ no .gitignore. Categorias incluídas para referência na restauração.',
    productCount: productsRaw.length,
    categoryCount: categoriesRaw.length,
    categories: categoriesRaw.map((c) => serializeCategory(c as Record<string, unknown>)),
    products: productsRaw.map((p) => serializeProduct(p as Record<string, unknown>)),
  };

  writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n✅ Backup gravado: ${outFile}`);
  console.log(`   Produtos: ${productsRaw.length} | Categorias (cópia): ${categoriesRaw.length}`);

  const del = await productsCol.deleteMany({});
  console.log(`\n✅ Removidos ${del.deletedCount} documento(s) da coleção "products".`);
  console.log('   Categorias mantidas (podem ficar vazias até novos produtos no Admin).\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
