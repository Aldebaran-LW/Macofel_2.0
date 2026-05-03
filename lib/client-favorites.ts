/**
 * Favoritos no browser (por utilizador autenticado), até existir API persistente.
 * Chave: macofel:favorites:<userId> → JSON string[] de productIds (Mongo).
 */
const STORAGE_PREFIX = 'macofel:favorites:';

export function readFavoriteProductIds(userId: string): string[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x ?? '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function writeFavoriteProductIds(userId: string, ids: string[]) {
  if (typeof window === 'undefined' || !userId) return;
  const uniq = Array.from(new Set(ids.map((x) => String(x).trim()).filter(Boolean)));
  window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(uniq));
}

/** Devolve true se o produto passou a estar nos favoritos. */
export function toggleFavoriteProduct(userId: string, productId: string): boolean {
  const id = String(productId ?? '').trim();
  if (!userId || !id) return false;
  const cur = readFavoriteProductIds(userId);
  const has = cur.includes(id);
  const next = has ? cur.filter((x) => x !== id) : [...cur, id];
  writeFavoriteProductIds(userId, next);
  return !has;
}

export function isFavoriteProduct(userId: string, productId: string): boolean {
  const id = String(productId ?? '').trim();
  if (!userId || !id) return false;
  return readFavoriteProductIds(userId).includes(id);
}
