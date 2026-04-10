/**
 * Normaliza um telefone para algo próximo de E.164.
 * Foco em Brasil: se vier 10/11 dígitos, prefixa +55.
 *
 * Retorna null se não der para normalizar com segurança.
 */
export function normalizePhoneE164(raw: string): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;

  // Já veio com DDI (assumimos formato internacional sem +).
  if (digits.length >= 12 && digits.length <= 15) {
    return `+${digits}`;
  }

  // Brasil (DDD + número): 10 (fixo) ou 11 (celular).
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}

