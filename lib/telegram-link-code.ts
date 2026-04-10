import crypto from 'crypto';

function base32NoPadding(bytes: Buffer): string {
  // Crockford-like base32 (sem I/L/O/U para reduzir confusão).
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

export function generateTelegramLinkCode(): string {
  // 8 chars base32 ≈ 40 bits (bruteforce inviável com rate limit + TTL).
  const raw = base32NoPadding(crypto.randomBytes(6)).slice(0, 8);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function hashTelegramLinkCode(code: string): string {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

