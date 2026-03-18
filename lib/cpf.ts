export function normalizeCpf(value: string): string {
  return (value ?? '').toString().replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map((c) => parseInt(c, 10));

  // 1º dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) sum1 += digits[i] * (10 - i);
  const mod1 = sum1 % 11;
  const dv1 = mod1 < 2 ? 0 : 11 - mod1;
  if (digits[9] !== dv1) return false;

  // 2º dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) sum2 += digits[i] * (11 - i);
  const mod2 = sum2 % 11;
  const dv2 = mod2 < 2 ? 0 : 11 - mod2;
  if (digits[10] !== dv2) return false;

  return true;
}

export function formatCpf(value: string): string {
  const cpf = normalizeCpf(value).slice(0, 11);
  const p1 = cpf.slice(0, 3);
  const p2 = cpf.slice(3, 6);
  const p3 = cpf.slice(6, 9);
  const p4 = cpf.slice(9, 11);
  if (cpf.length <= 3) return p1;
  if (cpf.length <= 6) return `${p1}.${p2}`;
  if (cpf.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

