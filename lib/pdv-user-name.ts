/**
 * Normaliza e valida o User Name usado no login do PDV (interno).
 * Site: email completo + senha. PDV: este identificador + mesma senha.
 */

const PDV_USER_RE = /^[a-z0-9_-]{2,32}$/;

export function normalizePdvUserName(raw: string): string {
  return String(raw).trim().toLowerCase();
}

export function isValidPdvUserName(normalized: string): boolean {
  return PDV_USER_RE.test(normalized);
}

export function validatePdvUserNameInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = normalizePdvUserName(raw);
  if (!value) {
    return { ok: false, error: 'User Name é obrigatório para funcionários no PDV.' };
  }
  if (!isValidPdvUserName(value)) {
    return {
      ok: false,
      error:
        'User Name: 2 a 32 caracteres, apenas letras minúsculas, números, _ e - (sem espaços).',
    };
  }
  return { ok: true, value };
}
