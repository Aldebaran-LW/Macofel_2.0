import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb-native';
import mongoPrisma from '@/lib/mongodb';
import type { EnrichProductOutput } from '@/lib/macofel-ai-studio-enrichment';

async function resolveCategoryIdFromMacroSlug(
  macroSlug: string
): Promise<string | null> {
  const slug = String(macroSlug ?? '').trim();
  if (!slug) return null;
  const c = await mongoPrisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  return c?.id ?? null;
}

/**
 * Aplica o JSON do enriquecimento AI Studio ao documento `products`.
 * Atualiza sempre `description` e categorias macro; imagens/peso/dimensões só se vierem preenchidos.
 */
export async function persistAiStudioProductEnrichment(
  productId: string,
  enrichment: EnrichProductOutput
): Promise<
  | { ok: true; fields: string[] }
  | { ok: false; reason: string }
> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(productId);
  } catch {
    return { ok: false, reason: 'productId não é um ObjectId válido' };
  }

  const categoryId = await resolveCategoryIdFromMacroSlug(
    enrichment.macroCategorySlug
  );

  const $set: Record<string, unknown> = {
    description: enrichment.description,
    category: enrichment.macroCategorySlug,
    macroCategorySlug: enrichment.macroCategorySlug,
    studioEnrichmentAt: new Date(),
    studioEnrichmentNotes: enrichment.notes.slice(0, 2000),
    studioEnrichmentConfidence: enrichment.confidence,
    updatedAt: new Date(),
  };
  if (categoryId) $set.categoryId = categoryId;

  const firstImg =
    enrichment.imageUrl?.trim() ||
    (enrichment.imageUrls.length > 0 ? enrichment.imageUrls[0] : null);
  if (firstImg && /^https?:\/\//i.test(firstImg)) {
    $set.imageUrl = firstImg;
  }
  if (enrichment.imageUrls.length > 0) {
    const urls = enrichment.imageUrls.filter(
      (u) => typeof u === 'string' && /^https?:\/\//i.test(u)
    );
    if (urls.length) $set.imageUrls = urls;
  }
  if (enrichment.weight != null && Number.isFinite(enrichment.weight)) {
    $set.weight = enrichment.weight;
  }
  if (enrichment.dimensionsCm?.trim()) {
    $set.dimensionsCm = enrichment.dimensionsCm.trim().replace(/x/gi, ' × ');
  }

  const fields = Object.keys($set);

  try {
    const db = await connectToDatabase();
    const res = await db
      .collection('products')
      .updateOne({ _id: oid }, { $set });
    if (res.matchedCount === 0) {
      return { ok: false, reason: 'Produto não encontrado' };
    }
    return { ok: true, fields };
  } catch {
    return { ok: false, reason: 'Erro ao gravar no MongoDB' };
  }
}
