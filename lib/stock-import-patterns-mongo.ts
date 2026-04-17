import { connectToDatabase } from '@/lib/mongodb-native';
import type { StockImportColumnMapping } from '@/lib/stock-import-rows-with-mapping';

let importPatternsIndexesEnsured = false;

async function ensureImportPatternsIndexes(): Promise<void> {
  if (importPatternsIndexesEnsured) return;
  importPatternsIndexesEnsured = true;
  try {
    const db = await connectToDatabase();
    await db
      .collection('import_patterns')
      .createIndex({ report_fingerprint: 1 }, { unique: true, name: 'import_patterns_fingerprint_unique' });
  } catch {
    importPatternsIndexesEnsured = false;
  }
}

export type ImportPatternDoc = {
  report_fingerprint: string;
  headers_snapshot?: string[];
  mapping: StockImportColumnMapping;
  usage_count: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string | null;
};

export async function findStockImportPattern(
  fingerprint: string
): Promise<ImportPatternDoc | null> {
  await ensureImportPatternsIndexes();
  const db = await connectToDatabase();
  const doc = await db.collection('import_patterns').findOne({ report_fingerprint: fingerprint });
  return doc as ImportPatternDoc | null;
}

export async function upsertStockImportPattern(
  fingerprint: string,
  headers: string[],
  mapping: StockImportColumnMapping,
  updatedBy: string | null
): Promise<void> {
  await ensureImportPatternsIndexes();
  const db = await connectToDatabase();
  const col = db.collection('import_patterns');
  const now = new Date();
  const existing = await col.findOne({ report_fingerprint: fingerprint });

  if (existing) {
    await col.updateOne(
      { report_fingerprint: fingerprint },
      {
        $set: {
          mapping,
          headers_snapshot: headers,
          updatedAt: now,
          updatedBy,
        },
        $inc: { usage_count: 1 },
      }
    );
    return;
  }

  await col.insertOne({
    report_fingerprint: fingerprint,
    mapping,
    headers_snapshot: headers,
    usage_count: 1,
    createdAt: now,
    updatedAt: now,
    updatedBy,
  });
}
