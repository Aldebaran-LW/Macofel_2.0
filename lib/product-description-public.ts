/**
 * Remove da descrição trechos típicos de custo vindos de relatórios (ex.: "Custo: 12.5.")
 * apenas para exibição na vitrine — não altera o valor gravado em Mongo nem colunas da importação.
 */
export function sanitizePublicProductDescription(input: unknown): string {
  let s = String(input ?? '');
  if (!s) return '';

  // "Custo: 12." / "custo: 1.234,56." / "Custo: R$ 10,99."
  const costLabel =
    /\b[Cc]usto\s*:\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*\.?/gu;
  s = s.replace(costLabel, '');

  // Possíveis rótulos de sistema / planilha
  s = s.replace(
    /\b[Vv][Ll]\.?\s*[Ee][Ss][Tt]\.?\s*[Cc][Uu][Ss][Tt][Oo]\s*:\s*(?:R\$\s*)?[\d\s.,]+\s*\.?/gu,
    ''
  );

  const precoCusto =
    /\b[Pp]re[cç]o\s+de\s+custo\s*:\s*(?:R\$\s*)?[\d\s.,]+\s*\.?|\b[Pp][Cc]\s*:\s*(?:R\$\s*)?[\d\s.,]+\s*\.?/gu;
  s = s.replace(precoCusto, '');

  s = s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .trim();

  return s;
}
