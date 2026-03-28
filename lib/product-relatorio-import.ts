import mongoPrisma from './mongodb';
import type { RelatorioProdutoPdfRow } from './relatorio-produtos-pdf';
import {
  PDF_CATEGORY,
  buildPdfImportDescription,
  pdfRowToCatalogPrice,
} from './relatorio-produtos-pdf';
import type { RelatorioEstoqueRow } from './relatorio-estoque-xls';
import {
  buildImportDescription,
  importRowSlug,
  slugifyProductKey,
} from './relatorio-estoque-xls';

export type RelatorioProductImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { name: string; message: string }[];
  totalProcessed: number;
};

export type ProductCatalogImportRow = {
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryName: string;
  weight?: number | null;
};

async function uniqueCategorySlug(base: string): Promise<string> {
  let s = base.slice(0, 80) || 'categoria';
  let i = 0;
  for (;;) {
    const ex = await mongoPrisma.category.findUnique({ where: { slug: s } });
    if (!ex) return s;
    i += 1;
    s = `${base}-${i}`.slice(0, 80);
  }
}

async function resolveCategoryId(
  grupo: string,
  cache: Map<string, string>,
  existingCategories: { id: string; name: string }[]
): Promise<string> {
  const g = grupo.trim() || 'Sem grupo';
  const key = g.toLowerCase();
  const hitCache = cache.get(key);
  if (hitCache) return hitCache;

  const hit = existingCategories.find((c) => c.name.trim().toLowerCase() === key);
  if (hit) {
    cache.set(key, hit.id);
    return hit.id;
  }

  const slugBase = slugifyProductKey(g) || 'sem-grupo';
  const slug = await uniqueCategorySlug(slugBase);
  const created = await mongoPrisma.category.create({
    data: {
      name: g,
      slug,
      description: 'Categoria criada na importação do catálogo.',
    },
  });
  existingCategories.push({ id: created.id, name: created.name });
  cache.set(key, created.id);
  return created.id;
}

async function uniqueProductSlug(base: string): Promise<string> {
  let s = base.slice(0, 120);
  let i = 0;
  for (;;) {
    const ex = await mongoPrisma.product.findUnique({ where: { slug: s } });
    if (!ex) return s;
    i += 1;
    s = `${base}-${i}`.slice(0, 120);
  }
}

/**
 * Importa linhas normalizadas (Excel, PDF, etc.).
 */
export async function runProductCatalogImport(
  rows: ProductCatalogImportRow[],
  options: { upsert: boolean }
): Promise<RelatorioProductImportResult> {
  const catCache = new Map<string, string>();
  const existingCategories = await mongoPrisma.category.findMany({
    select: { id: true, name: true },
  });
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { name: string; message: string }[] = [];

  for (const row of rows) {
    const baseSlug = importRowSlug(row.code, row.name);
    const categoryId = await resolveCategoryId(row.categoryName, catCache, existingCategories);
    const price = row.price;
    const weightVal =
      row.weight != null && Number.isFinite(row.weight) && row.weight > 0 ? row.weight : null;

    try {
      const existing = await mongoPrisma.product.findUnique({
        where: { slug: baseSlug },
      });

      if (existing) {
        if (!options.upsert) {
          skipped += 1;
          continue;
        }
        await mongoPrisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            description: row.description,
            price,
            stock: row.stock,
            categoryId,
            weight: weightVal,
          },
        });
        updated += 1;
        continue;
      }

      const newSlug = await uniqueProductSlug(baseSlug);

      await mongoPrisma.product.create({
        data: {
          name: row.name,
          slug: newSlug,
          description: row.description,
          price,
          stock: row.stock,
          minStock: 0,
          categoryId,
          featured: false,
          weight: weightVal,
        },
      });
      created += 1;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ name: row.name, message });
    }
  }

  return {
    created,
    updated,
    skipped,
    errors,
    totalProcessed: rows.length,
  };
}

export async function runRelatorioProductImport(
  rows: RelatorioEstoqueRow[],
  options: { upsert: boolean }
): Promise<RelatorioProductImportResult> {
  const mapped: ProductCatalogImportRow[] = rows.map((r) => ({
    code: r.code,
    name: r.name,
    description: buildImportDescription(r),
    price: r.price,
    stock: r.stock,
    categoryName: r.grupo,
    weight: null,
  }));
  return runProductCatalogImport(mapped, options);
}

export async function runPdfRelatorioProductImport(
  rows: RelatorioProdutoPdfRow[],
  options: { upsert: boolean }
): Promise<RelatorioProductImportResult> {
  const mapped: ProductCatalogImportRow[] = rows.map((r) => ({
    code: r.codigo,
    name: r.produto,
    description: buildPdfImportDescription(r),
    price: pdfRowToCatalogPrice(r),
    stock: r.estoque,
    categoryName: PDF_CATEGORY,
    weight: r.peso > 0 ? r.peso : null,
  }));
  return runProductCatalogImport(mapped, options);
}
