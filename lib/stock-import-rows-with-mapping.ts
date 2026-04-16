/**
 * Conversão de linhas tabulares (CSV/XLSX como objetos) usando mapeamento explícito de colunas.
 * Usável no cliente e no servidor (sem dependências de Node).
 */

import { guessStockImportColumns } from '@/lib/stock-import-column-detect';

export type StockImportColumnMapping = {
  codigo: string | null;
  quantidade: string | null;
  nome: string | null;
};

export type StockImportParsedRow = {
  externalCode: string | null;
  name: string | null;
  quantity: number;
};

function norm(v: unknown) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.length ? s : null;
}

function parseLocaleNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
  const normalized = cleaned.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function getCell(row: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const want = key.trim().toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.trim().toLowerCase() === want) return row[k];
  }
  return undefined;
}

export function guessToColumnMapping(headers: string[]): StockImportColumnMapping {
  const g = guessStockImportColumns(headers);
  return {
    codigo: g.codeColumn,
    quantidade: g.quantityColumn,
    nome: g.nameColumn,
  };
}

/** Valida que as chaves escolhidas existem na primeira linha (ou lista de cabeçalhos). */
export function mappingTargetsExistInHeaders(
  headers: string[],
  mapping: StockImportColumnMapping
): { ok: boolean; missing: string[] } {
  const set = new Set(headers.map((h) => h.trim()));
  const missing: string[] = [];
  if (mapping.codigo && !set.has(mapping.codigo.trim())) missing.push('codigo');
  if (mapping.quantidade && !set.has(mapping.quantidade.trim())) missing.push('quantidade');
  if (mapping.nome && !set.has(mapping.nome.trim())) missing.push('nome');
  return { ok: missing.length === 0, missing };
}

export function rowsToParsedItems(
  rows: Record<string, unknown>[],
  mapping: StockImportColumnMapping
): StockImportParsedRow[] {
  const cc = mapping.codigo?.trim() ?? '';
  const qc = mapping.quantidade?.trim() ?? '';
  if (!cc || !qc) return [];

  const nc = mapping.nome?.trim() ?? '';
  const out: StockImportParsedRow[] = [];

  for (const r of rows) {
    const externalCode = norm(getCell(r, cc));
    const name = nc ? norm(getCell(r, nc)) : null;
    const quantity = parseLocaleNumber(getCell(r, qc));
    if (!externalCode && !name) continue;
    if (!quantity || quantity <= 0) continue;
    if (!externalCode) continue;
    out.push({ externalCode, name, quantity });
  }
  return out;
}
