import mongoPrisma from '@/lib/mongodb';
import { STOREFRONT_CATEGORY_SLUG_ORDER } from '@/lib/storefront-categories';

/**
 * `categoryId` explícito (admin) ou primeira macro da vitrine existente na BD — usado quando
 * o grupo não mapeia (ou PDF/linha sem grupo).
 */
export async function resolveImportFallbackCategoryId(
  explicitCategoryId: string | null | undefined
): Promise<{ id: string; usedExplicit: boolean } | null> {
  const trimmed = String(explicitCategoryId ?? '').trim();
  if (trimmed) {
    const cat = await mongoPrisma.category.findUnique({ where: { id: trimmed } });
    if (!cat) return null;
    return { id: cat.id, usedExplicit: true };
  }

  const slugs = [...STOREFRONT_CATEGORY_SLUG_ORDER];
  const cats = await mongoPrisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
  for (const slug of slugs) {
    const id = bySlug.get(slug);
    if (id) return { id, usedExplicit: false };
  }

  const anyCat = await mongoPrisma.category.findFirst({ orderBy: { name: 'asc' } });
  return anyCat ? { id: anyCat.id, usedExplicit: false } : null;
}
