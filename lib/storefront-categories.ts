/**
 * Categorias macro exibidas na vitrine (menu, catálogo, carrosséis).
 * Alinhado ao seed (`scripts/seed-mongodb.ts`) e ao mapa `grupo-macro-categoria`.
 * Admin continua a ver todas as categorias em `/api/categories` sem `storefront=1`.
 */
export const STOREFRONT_CATEGORY_SLUG_ORDER = [
  'cimento-argamassa',
  'tijolos-blocos',
  'tintas-acessorios',
  'ferramentas',
  'material-hidraulico',
  'material-eletrico',
] as const;

export type StorefrontCategorySlug = (typeof STOREFRONT_CATEGORY_SLUG_ORDER)[number];

const SLUG_SET = new Set<string>(STOREFRONT_CATEGORY_SLUG_ORDER);

export function isStorefrontCategorySlug(slug: string): boolean {
  return SLUG_SET.has(slug);
}

/** Mantém só slugs da vitrine, na ordem canónica (omite ausentes na BD). */
export function filterCategoriesForStorefront<T extends { slug: string }>(categories: T[]): T[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return STOREFRONT_CATEGORY_SLUG_ORDER.map((slug) => bySlug.get(slug)).filter(
    (c): c is T => c != null
  );
}
