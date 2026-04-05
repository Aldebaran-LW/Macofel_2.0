const INTERNAL_CATEGORY_LABELS = new Set(['importado pdf']);

export function publicCategoryLabel(raw: string | null | undefined): string | null {
  const name = String(raw ?? '').trim();
  if (!name) return null;
  if (INTERNAL_CATEGORY_LABELS.has(name.toLowerCase())) return null;
  return name;
}
