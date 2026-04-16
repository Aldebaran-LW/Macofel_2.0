/**
 * CSV com cabeçalho → lista de objetos (chaves = rótulos da primeira linha).
 */

function splitCsvRow(row: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      const next = row[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim());
}

function detectDelimiter(headerLine: string): string {
  const line = headerLine ?? '';
  const commas = (line.match(/,/g) ?? []).length;
  const semicolons = (line.match(/;/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs > 0) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

const HEADER_MARKERS = [
  'cprod',
  'codigo',
  'código',
  'codigo_sistema',
  'codigo_fornecedor',
  'productid',
  'idcodigo',
  'id código',
  'nome',
  'xprod',
  'qcom',
  'quantidade',
  'qtd',
  'estoque',
  'estoque_atual',
];

function csvLooksLikeHeaderRow(cells: string[]): boolean {
  const lowered = cells.map((c) => String(c ?? '').trim().toLowerCase());
  return lowered.some((c) => HEADER_MARKERS.includes(c));
}

export type CsvTabularResult = {
  headers: string[];
  rows: Record<string, unknown>[];
  hasHeader: boolean;
};

/**
 * Se não houver cabeçalho reconhecível, devolve `null` (use o parser clássico posicional).
 */
export function tryParseCsvAsObjects(text: string): CsvTabularResult | null {
  const rawLines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!rawLines.length) return null;

  const delimiter = detectDelimiter(rawLines[0]);
  const matrix = rawLines.map((l) => splitCsvRow(l, delimiter));
  if (!matrix.length) return null;

  const headerCells = matrix[0].map((c) => String(c ?? '').trim());
  const hasHeader = csvLooksLikeHeaderRow(headerCells);
  if (!hasHeader) return null;

  const headers = headerCells.filter((_, i) => headerCells[i] !== '');
  const dataRows = matrix.slice(1);
  const rows: Record<string, unknown>[] = [];

  for (const r of dataRows) {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headerCells.length; i++) {
      const key = headerCells[i];
      if (!key) continue;
      obj[key] = r[i] ?? '';
    }
    rows.push(obj);
  }

  return { headers: headerCells.filter(Boolean), rows, hasHeader: true };
}
