/**
 * Deteção heurística de colunas em relatórios de estoque (CSV / folhas XLSX).
 * Usado só para feedback ao utilizador — o parsing continua a aceitar vários aliases.
 */

export type StockImportGuessedMapping = {
  codeColumn: string | null;
  quantityColumn: string | null;
  nameColumn: string | null;
};

const CODE_CANDS = [
  'cprod',
  'codigo',
  'código',
  'codigo_sistema',
  'codigo_fornecedor',
  'productid',
  'id',
  'idcodigo',
  'id código',
  'id_codigo',
  'produto_id',
  'cod.item',
  'cod item',
  'cod_item',
  'sku',
  'ref',
  'referencia',
  'referência',
];

const QTY_CANDS = [
  'qcom',
  'quantidade',
  'quantidade_comprada',
  'qtd',
  'qtdcom',
  'qtd_comprada',
  'estoque',
  'estoque_atual',
  'qty',
  'qtd estoque',
  'qtd. estoque',
];

const NAME_CANDS = [
  'xprod',
  'produto',
  'nome',
  'descricao',
  'descrição',
  'descricao produto',
  'descrição produto',
];

function normHeader(h: string) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findBest(headers: string[], candidates: string[]): string | null {
  const lowered = headers.map((h) => normHeader(h));
  for (const cand of candidates) {
    const c = normHeader(cand);
    const idx = lowered.findIndex((h) => h === c || h.includes(c) || c.includes(h));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

export function guessStockImportColumns(headers: string[]): StockImportGuessedMapping {
  const clean = headers.map((h) => String(h ?? '').trim()).filter(Boolean);
  if (!clean.length) {
    return { codeColumn: null, quantityColumn: null, nameColumn: null };
  }
  return {
    codeColumn: findBest(clean, CODE_CANDS),
    quantityColumn: findBest(clean, QTY_CANDS),
    nameColumn: findBest(clean, NAME_CANDS),
  };
}

export function formatGuessedMappingLabel(m: StockImportGuessedMapping): string {
  const parts: string[] = [];
  if (m.codeColumn) parts.push(`código → «${m.codeColumn}»`);
  if (m.quantityColumn) parts.push(`quantidade → «${m.quantityColumn}»`);
  if (m.nameColumn) parts.push(`nome → «${m.nameColumn}»`);
  return parts.length ? parts.join(' · ') : 'Cabeçalhos não reconhecidos automaticamente — confira o ficheiro.';
}
