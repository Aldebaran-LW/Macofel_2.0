import crypto from 'crypto';

/** Normaliza rótulo de coluna para comparação estável. */
export function normalizeStockImportHeaderLabel(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Assinatura do "formato" do relatório: conjunto de cabeçalhos (ordem irrelevante).
 * Igual para o mesmo conjunto de colunas com nomes equivalentes após normalização.
 */
export function stockImportFingerprintFromHeaders(headers: string[]): string {
  const uniq = [...new Set(headers.map(normalizeStockImportHeaderLabel).filter(Boolean))].sort();
  return crypto.createHash('sha256').update(uniq.join('\u001e'), 'utf8').digest('hex');
}
