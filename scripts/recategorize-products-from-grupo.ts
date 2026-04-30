import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectToDatabase, disconnectMongoNativeClient } from '@/lib/mongodb-native';
import { macroCategorySlugForGrupo } from '@/lib/grupo-macro-categoria';
import { STOREFRONT_CATEGORY_SLUG_ORDER } from '@/lib/storefront-categories';

type RecategorizeResult = {
  scanned: number;
  updated: number;
  skipped: number;
  unknownGrupo: number;
  missingMacroCategory: number;
};

function truthyFlag(name: string): boolean {
  const v = String(process.env[name] ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

function normalizeCategoryId(raw: unknown): string {
  if (raw instanceof ObjectId) return raw.toString();
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s;
}

async function main() {
  const dryRun = truthyFlag('DRY_RUN');
  const limitRaw = Number(process.env.LIMIT ?? 0);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.trunc(limitRaw) : 0;

  const db = await connectToDatabase();
  const products = db.collection('products');
  const categories = db.collection('categories');

  // Map slug -> category _id (string)
  const catDocs = await categories
    .find({ slug: { $in: [...STOREFRONT_CATEGORY_SLUG_ORDER] } }, { projection: { _id: 1, slug: 1 } })
    .toArray();
  const categoryIdBySlug = new Map<string, string>(
    catDocs.map((c: any) => [String(c.slug ?? ''), String(c._id?.toString?.() ?? '')])
  );

  const result: RecategorizeResult = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    unknownGrupo: 0,
    missingMacroCategory: 0,
  };

  const cursor = products.find(
    { subcategoria: { $exists: true } },
    { projection: { _id: 1, subcategoria: 1, categoryId: 1 } }
  );

  for await (const doc of cursor as any) {
    result.scanned += 1;
    if (limit && result.scanned > limit) break;

    const grupo = typeof doc.subcategoria === 'string' ? doc.subcategoria : String(doc.subcategoria ?? '');
    const macroSlug = macroCategorySlugForGrupo(grupo);
    if (!macroSlug) {
      result.unknownGrupo += 1;
      result.skipped += 1;
      continue;
    }

    const desiredCategoryId = categoryIdBySlug.get(macroSlug) ?? '';
    if (!desiredCategoryId) {
      result.missingMacroCategory += 1;
      result.skipped += 1;
      continue;
    }

    const currentCategoryId = normalizeCategoryId(doc.categoryId);
    if (currentCategoryId === desiredCategoryId) {
      result.skipped += 1;
      continue;
    }

    if (!dryRun) {
      await products.updateOne(
        { _id: doc._id },
        { $set: { categoryId: desiredCategoryId, updatedAt: new Date() } }
      );
    }

    result.updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dryRun,
        limit: limit || null,
        ...result,
        note:
          'updated = produtos cujo categoryId foi ajustado a partir do subcategoria (grupo). unknownGrupo = grupo vazio/desconhecido no mapa.',
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongoNativeClient().catch(() => {});
  });

