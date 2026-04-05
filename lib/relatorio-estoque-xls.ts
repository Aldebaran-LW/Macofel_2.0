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
  /** -1 se a folha não tiver coluna de valor a prazo */
  vlVendaPrazoCol: number;
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
  vlVendaPrazo: number;
  /** Preço unitário à vista (catálogo) */
  price: number;
  /** Preço unitário a prazo quando a folha traz a coluna */
  pricePrazo: number;
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

/** Índice da linha de cabeçalho (Produto, Grupo, Marca, Estoque…); -1 se não encontrar. */
export function findRelatorioEstoqueHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 6) continue;
    const c0 = String(r[0] ?? '').trim();
    if (c0 !== 'Produto') continue;
    const hasGrupo = r.some((c) => String(c ?? '').trim() === 'Grupo');
    const hasMarca = r.some((c) => String(c ?? '').trim() === 'Marca');
    const hasEstoque = r.some((c) => {
      const t = String(c ?? '').trim();
      return t === 'Estoque' || t.includes('Estoque');
    });
    if (hasGrupo && hasMarca && hasEstoque) return i;
  }
  return -1;
}

/** Código numérico de produto (pode incluir separador de milhares). */
function looksLikeProductCode(s: string): boolean {
  const t = s.replace(/\s/g, '');
  if (!t) return false;
  return /^[\d][\d.,-]*$/u.test(t);
}

/**
 * Folha "larga" (Grupo em F): nome na coluna do 2.º "Produto".
 * Folha "com código duplicado" (A=código, B=código, C=nome): 2 "Produto" seguidos mas o nome está em C.
 */
function resolveNameCol(
  produtoIdxs: number[],
  sampleRow: string[] | undefined,
  grupoCol: number
): number {
  if (produtoIdxs.length < 2) {
    const first = produtoIdxs[0] ?? 0;
    const next = first + 1;
    if (grupoCol > next && next >= 0) return next;
    return Math.max(0, first);
  }

  const a = produtoIdxs[0];
  const b = produtoIdxs[1];

  if (b !== a + 1) {
    return b;
  }

  if (sampleRow && sampleRow.length > b + 1) {
    const cellA = String(sampleRow[a] ?? '').trim();
    const cellB = String(sampleRow[b] ?? '').trim();
    const cellC = String(sampleRow[b + 1] ?? '').trim();
    const duplicateCode = cellA !== '' && cellB === cellA && looksLikeProductCode(cellB);
    if (duplicateCode && cellC.length >= 3) {
      return b + 1;
    }
    if (cellB.length > 0 && !looksLikeProductCode(cellB)) {
      return b;
    }
    if (cellC.length > cellB.length && cellC.length >= 8 && looksLikeProductCode(cellB)) {
      return b + 1;
    }
  }

  return b;
}

function buildColMap(header: string[], sampleRow?: string[]): RelatorioEstoqueColMap | null {
  const produtoIdxs = header
    .map((v, idx) => (String(v ?? '').trim() === 'Produto' ? idx : -1))
    .filter((idx) => idx >= 0);
  if (produtoIdxs.length < 1) return null;

  const grupoCol = header.findIndex((c) => String(c ?? '').trim() === 'Grupo');
  const marcaCol = header.findIndex((c) => String(c ?? '').trim() === 'Marca');
  if (grupoCol < 0 || marcaCol < 0) return null;

  const estoqueCol = header.findIndex((v) => {
    const t = String(v ?? '').trim();
    return t === 'Estoque' || t.includes('Estoque');
  });
  const vlCustoCol = header.findIndex(
    (v) => v.includes('Vl.Est.Custo') || v.toLowerCase().includes('vl.est.custo')
  );
  const vlVendaPrazoCol = header.findIndex((v) => {
    const tl = String(v ?? '')
      .trim()
      .toLowerCase();
    return (
      tl.includes('venda prazo') ||
      tl.includes('vl.est.venda prazo') ||
      tl.includes('vl.est.prazo') ||
      tl.includes('vlest.vendaprazo')
    );
  });
  const vlVendaCol = header.findIndex((v) => {
    const t = String(v ?? '').trim();
    const tl = t.toLowerCase();
    if (tl.includes('prazo')) return false;
    return (
      t.includes('Vl.Est.Venda') ||
      tl.includes('vl.est.venda') ||
      tl.includes('venda vista') ||
      tl === 'venda vista'
    );
  });

  if (estoqueCol < 0) return null;

  const codeCol = produtoIdxs[0];
  const nameCol = resolveNameCol(produtoIdxs, sampleRow, grupoCol);

  return {
    codeCol,
    nameCol,
    grupoCol,
    marcaCol,
    estoqueCol,
    vlCustoCol,
    vlVendaCol,
    vlVendaPrazoCol,
  };
}

function firstSampleDataRow(rows: string[][], headerIdx: number): string[] | undefined {
  for (let r = headerIdx + 1; r < Math.min(headerIdx + 15, rows.length); r++) {
    const row = rows[r];
    if (!row?.length) continue;
    const c0 = String(row[0] ?? '').trim();
    const c1 = String(row[1] ?? '').trim();
    const c2 = String(row[2] ?? '').trim();
    if (c0 && (c1 || c2)) return row;
  }
  return undefined;
}

function isFooterOrNoise(row: string[], nameCol: number, codeCol: number): boolean {
  const name = String(row[nameCol] ?? '').trim();
  const code = String(row[codeCol] ?? '').trim();
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

/**
 * Relatório LW «Produtos / código de barras»: colunas Custo e Venda Vista são **unitárias** por artigo,
 * não «valor total em estoque». O catálogo deve usar Venda Vista (à vista) tal como vem na folha.
 */
export function catalogUnitPriceLwBarcode(_stock: number, vlVenda: number, vlCusto: number): number {
  void _stock;
  const vv = Number.isFinite(vlVenda) && vlVenda > 0 ? vlVenda : 0;
  if (vv > 0) return Math.max(0, Math.round(vv * 10000) / 10000);
  const vc = Number.isFinite(vlCusto) && vlCusto > 0 ? vlCusto : 0;
  return Math.max(0, Math.round(vc * 10000) / 10000);
}

/** LW: coluna «Venda Prazo» também é unitária por artigo (como a vista). */
export function catalogPrazoUnitLwBarcode(_stock: number, vlVendaPrazo: number): number {
  void _stock;
  const v = Number.isFinite(vlVendaPrazo) && vlVendaPrazo > 0 ? vlVendaPrazo : 0;
  return Math.max(0, Math.round(v * 10000) / 10000);
}

export type ParseRelatorioEstoqueSheetOpts = {
  /** LW código de barras / produtos: Venda Vista = preço unitário à vista. */
  vendaVistaIsUnitPrice?: boolean;
};

/**
 * Matriz de células (ex.: folha Excel ou tabela Word) com o mesmo cabeçalho «Relação de estoque».
 */
export function parseRelatorioEstoqueFromSheetRows(
  rows: string[][],
  sheetName: string,
  opts?: ParseRelatorioEstoqueSheetOpts
): { rows: RelatorioEstoqueRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const out: RelatorioEstoqueRow[] = [];

  const hi = findRelatorioEstoqueHeaderRowIndex(rows);
  if (hi < 0) {
    warnings.push(`Folha ignorada (sem cabeçalho esperado): ${sheetName}`);
    return { rows: out, warnings };
  }
  const sample = firstSampleDataRow(rows, hi);
  const colMap = buildColMap(rows[hi], sample);
  if (!colMap) {
    warnings.push(`Folha ignorada (colunas incompletas): ${sheetName}`);
    return { rows: out, warnings };
  }

  for (let r = hi + 1; r < rows.length; r++) {
    const cells = rows[r];
    if (!cells.length) continue;
    if (isFooterOrNoise(cells, colMap.nameCol, colMap.codeCol)) continue;

    const name = String(cells[colMap.nameCol] ?? '').trim();
    if (!name) continue;

    const code = String(cells[colMap.codeCol] ?? '').trim();
    const grupo = String(cells[colMap.grupoCol] ?? '').trim() || 'Sem grupo';
    const marca = String(cells[colMap.marcaCol] ?? '').trim() || '—';

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
    const vlVendaPrazoRaw =
      colMap.vlVendaPrazoCol >= 0 ? pickMoney(colMap.vlVendaPrazoCol) : NaN;

    const vc = Number.isFinite(vlCusto) ? vlCusto : 0;
    const vv = Number.isFinite(vlVenda) ? vlVenda : 0;
    const vvp = Number.isFinite(vlVendaPrazoRaw) ? vlVendaPrazoRaw : 0;

    const price = opts?.vendaVistaIsUnitPrice
      ? catalogUnitPriceLwBarcode(stock, vv, vc)
      : catalogUnitPrice(stock, vv, vc);

    const pricePrazo = opts?.vendaVistaIsUnitPrice
      ? catalogPrazoUnitLwBarcode(stock, vvp)
      : vvp > 0
        ? Math.max(0, deriveUnitPrice(stock, vvp, 0))
        : 0;

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
      vlVendaPrazo: vvp,
      price,
      pricePrazo,
    });
  }

  return { rows: out, warnings };
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
    const { rows: part, warnings: w } = parseRelatorioEstoqueFromSheetRows(rows, sheetName);
    out.push(...part);
    warnings.push(...w);
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
