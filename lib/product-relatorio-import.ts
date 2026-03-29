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
  cost?: number | null;
  pricePrazo?: number | null;
  unidade?: string | null;
  codBarra?: string | null;
  /** true = ATIVO */
  status?: boolean;
};

function normCodigo(code: string): string | null {
  const c = String(code ?? '').trim();
  return c.length ? c : null;
}

/** Custo unitário a partir de valores totais do relatório Excel (Vl.Est.Custo / estoque). */
function unitCostFromEstoqueRow(row: RelatorioEstoqueRow): number | null {
  const { stock, vlCusto } = row;
  if (!Number.isFinite(vlCusto) || vlCusto === 0) return null;
  if (!stock || Math.abs(stock) < 1e-6) return null;
  const u = Math.abs(vlCusto) / Math.abs(stock);
  return Number.isFinite(u) && u >= 0 ? Math.round(u * 10000) / 10000 : null;
}

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
    const weightVal =
      row.weight != null && Number.isFinite(row.weight) && row.weight > 0 ? row.weight : null;
    const codigo = normCodigo(row.code);
    const cost = row.cost != null && Number.isFinite(row.cost) ? row.cost : null;
    const pricePrazo =
      row.pricePrazo != null && Number.isFinite(row.pricePrazo) && row.pricePrazo > 0
        ? row.pricePrazo
        : null;
    const unidade = row.unidade?.trim() || null;
    const codBarra = row.codBarra?.replace(/\D/g, '') || null;
    const status = row.status !== false;

    try {
      let existing =
        (await mongoPrisma.product.findUnique({ where: { slug: baseSlug } })) ?? null;
      if (!existing && codigo) {
        existing =
          (await mongoPrisma.product.findUnique({
            where: { codigo },
          })) ?? null;
      }

      const price = row.price;

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
            codigo,
            cost,
            pricePrazo,
            unidade,
            codBarra,
            status,
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
          codigo,
          cost,
          pricePrazo,
          unidade,
          codBarra,
          status,
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
    cost: unitCostFromEstoqueRow(r),
    pricePrazo: null,
    unidade: null,
    codBarra: null,
    status: true,
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
    cost: r.custo > 0 && Number.isFinite(r.custo) ? r.custo : null,
    pricePrazo: r.vendaPrazo > 0 && Number.isFinite(r.vendaPrazo) ? r.vendaPrazo : null,
    unidade: r.unid?.trim() || null,
    codBarra: r.codBarra ? String(r.codBarra).replace(/\D/g, '') || null : null,
    status: r.status?.toUpperCase() !== 'INATIVO',
  }));
  return runProductCatalogImport(mapped, options);
}
