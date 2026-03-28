/**
 * Parser do formato de exportação "Relação de estoque" / "Relatório de Produtos" (.xls/.xlsx).
 * Cabeçalho: Produto (código), Produto (nome), Grupo, Marca, Estoque, Vl.Est.Custo, Vl.Est.Venda.
 */

import * as XLSX from 'xlsx';

export type RelatorioEstoqueColMap = {
  codeCol: number;
  nameCol: number;
  grupoCol: number;
  marcaCol: number;
  estoqueCol: number;
  vlCustoCol: number;
  vlVendaCol: number;
};

export type RelatorioEstoqueRow = {
  sheetName: string;
  rowIndex: number;
  code: string;
  name: string;
  grupo: string;
  marca: string;
  stock: number;
  vlCusto: number;
  vlVenda: number;
  price: number;
};

export function slugifyProductKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function parseBrDecimal(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function rowAsArray(row: unknown): string[] {
  if (!row || !Array.isArray(row)) return [];
  return row.map((c) => String(c ?? '').trim());
}

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 5) continue;
    if (r[0] === 'Produto' && r[4] === 'Grupo') return i;
  }
  return -1;
}

function buildColMap(header: string[]): RelatorioEstoqueColMap | null {
  const produtoIdxs = header
    .map((v, idx) => (v === 'Produto' ? idx : -1))
    .filter((idx) => idx >= 0);
  if (produtoIdxs.length < 2) return null;

  const grupoCol = header.indexOf('Grupo');
  const marcaCol = header.indexOf('Marca');
  if (grupoCol < 0 || marcaCol < 0) return null;

  const estoqueCol = header.findIndex((v) => v === 'Estoque' || v.includes('Estoque'));
  const vlCustoCol = header.findIndex(
    (v) => v.includes('Vl.Est.Custo') || v.toLowerCase().includes('vl.est.custo')
  );
  const vlVendaCol = header.findIndex(
    (v) => v.includes('Vl.Est.Venda') || v.toLowerCase().includes('vl.est.venda')
  );

  if (estoqueCol < 0) return null;

  return {
    codeCol: produtoIdxs[0],
    nameCol: produtoIdxs[1],
    grupoCol,
    marcaCol,
    estoqueCol,
    vlCustoCol,
    vlVendaCol,
  };
}

function isFooterOrNoise(row: string[], nameCol: number): boolean {
  const name = String(row[nameCol] ?? '').trim();
  const code = String(row[0] ?? '').trim();
  if (!name && !code) return true;
  if (/^pag\.?\s*\d*$/i.test(name)) return true;
  const joined = row.join(' ').toLowerCase();
  if (joined.includes('pag.') && joined.includes('total')) return true;
  return false;
}

function deriveUnitPrice(stock: number, vlVenda: number, vlCusto: number): number {
  if (Number.isFinite(stock) && Math.abs(stock) >= 1e-6) {
    const u = vlVenda / stock;
    if (Number.isFinite(u) && u >= 0) return Math.round(u * 10000) / 10000;
    const u2 = Math.abs(vlVenda) / Math.abs(stock);
    if (Number.isFinite(u2)) return Math.round(u2 * 10000) / 10000;
  }
  if (Number.isFinite(vlCusto) && Number.isFinite(stock) && Math.abs(stock) >= 1e-6) {
    const u = vlCusto / stock;
    if (Number.isFinite(u)) return Math.max(0, Math.round(Math.abs(u) * 10000) / 10000);
  }
  return 0;
}

/** Preço unitário para o catálogo (nunca negativo). */
export function catalogUnitPrice(stock: number, vlVenda: number, vlCusto: number): number {
  return Math.max(0, deriveUnitPrice(stock, vlVenda, vlCusto));
}

export function parseRelatorioEstoqueWorkbook(buffer: ArrayBuffer): {
  rows: RelatorioEstoqueRow[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const out: RelatorioEstoqueRow[] = [];

  const wb = XLSX.read(buffer, { type: 'array' });
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    const rows = matrix.map((r) => rowAsArray(r));
    const hi = findHeaderRowIndex(rows);
    if (hi < 0) {
      warnings.push(`Folha ignorada (sem cabeçalho esperado): ${sheetName}`);
      continue;
    }
    const colMap = buildColMap(rows[hi]);
    if (!colMap) {
      warnings.push(`Folha ignorada (colunas incompletas): ${sheetName}`);
      continue;
    }

    for (let r = hi + 1; r < rows.length; r++) {
      const cells = rows[r];
      if (!cells.length) continue;
      if (isFooterOrNoise(cells, colMap.nameCol)) continue;

      const name = String(cells[colMap.nameCol] ?? '').trim();
      if (!name) continue;

      const code = String(cells[colMap.codeCol] ?? '').trim();
      const grupo = String(cells[colMap.grupoCol] ?? '').trim() || 'Sem grupo';
      const marca = String(cells[colMap.marcaCol] ?? '').trim() || '—';

      // O Excel costuma deslocar o valor de "Estoque" uma coluna à esquerda do cabeçalho.
      const stockCandidates = [
        colMap.estoqueCol,
        colMap.estoqueCol - 1,
        colMap.estoqueCol + 1,
      ].filter((i) => i >= 0);
      let stockRaw = NaN;
      for (const c of stockCandidates) {
        stockRaw = parseBrDecimal(cells[c]);
        if (Number.isFinite(stockRaw)) break;
      }
      const stock = Number.isFinite(stockRaw) ? Math.round(stockRaw) : 0;

      const pickMoney = (primary: number): number => {
        if (primary < 0) return NaN;
        const order = [primary, primary - 1, primary + 1].filter((i) => i >= 0);
        for (const c of order) {
          const n = parseBrDecimal(cells[c]);
          if (Number.isFinite(n)) return n;
        }
        return NaN;
      };

      const vlCusto = pickMoney(colMap.vlCustoCol);
      const vlVenda = pickMoney(colMap.vlVendaCol);

      const vc = Number.isFinite(vlCusto) ? vlCusto : 0;
      const vv = Number.isFinite(vlVenda) ? vlVenda : 0;
      const price = catalogUnitPrice(stock, vv, vc);

      out.push({
        sheetName,
        rowIndex: r + 1,
        code,
        name,
        grupo,
        marca,
        stock,
        vlCusto: vc,
        vlVenda: vv,
        price,
      });
    }
  }

  return { rows: out, warnings };
}

export function importRowSlug(code: string, name: string): string {
  const key = `${code || 'snc'}-${name}`.trim();
  const s = slugifyProductKey(key);
  return s.slice(0, 120) || slugifyProductKey(name).slice(0, 120) || 'produto';
}

export function buildImportDescription(row: RelatorioEstoqueRow): string {
  const parts = [`Grupo: ${row.grupo}.`, `Marca: ${row.marca}.`];
  if (row.code) parts.unshift(`Código: ${row.code}.`);
  return parts.join(' ');
}
