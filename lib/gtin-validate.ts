/**
 * Validação local de GTIN/EAN (comprimento + dígito de controlo GS1).
 * Alinhado a `buscar-produto-service` (8 / 12 / 13 / 14 dígitos).
 */

export function digitsOnlyGtin(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

/** Comprimentos GS1 usados no projeto (sem check). */
export function isPlausibleGtinLength(d: string): boolean {
  const n = d.length;
  return n === 8 || n === 12 || n === 13 || n === 14;
}

/**
 * Calcula o dígito de controlo GS1 para o corpo (sem o último dígito).
 */
export function gs1CheckDigit(bodyDigits: string): number {
  const nums = bodyDigits.replace(/\D/g, '').split('').map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i] * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Devolve apenas dígitos se o GTIN for válido (checksum); caso contrário `null`.
 */
export function normalizeValidGtin(raw: unknown): string | null {
  const d = digitsOnlyGtin(raw);
  if (!isPlausibleGtinLength(d)) return null;
  const body = d.slice(0, -1);
  const check = parseInt(d.slice(-1), 10);
  if (!Number.isFinite(check)) return null;
  const expected = gs1CheckDigit(body);
  return check === expected ? d : null;
}
