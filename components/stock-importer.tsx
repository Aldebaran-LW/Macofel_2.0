'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import StockSubnav from '@/components/stock-subnav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { importFileTooLarge, MAX_IMPORT_FILE_DESC } from '@/lib/import-upload-limits';
import ImportacaoEstoqueModal, {
  IMPORTACAO_ESTOQUE_CLASSICA_ID,
} from '@/components/importacao-estoque-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { guessStockImportColumns, formatGuessedMappingLabel } from '@/lib/stock-import-column-detect';
import { tryParseCsvAsObjects } from '@/lib/stock-import-csv-tabular';
import {
  rowsToParsedItems,
  type StockImportColumnMapping,
} from '@/lib/stock-import-rows-with-mapping';

type Source = 'csv' | 'xlsx' | 'xml' | 'pdf';

type ParsedItem = {
  externalCode: string | null;
  name: string | null;
  quantity: number;
};

type PreviewResolved = {
  externalCode: string | null;
  name: string | null;
  quantity: number;
  productId: string;
  productName: string;
  resolution: 'by_objectid' | 'by_mapping';
};

type PreviewConflict = {
  externalCode: string | null;
  name: string | null;
  quantity: number;
  reason: 'no_match' | 'invalid_objectid' | 'mapped_product_missing';
  suggestedProductId?: string | null;
};

type StockBucketRow = {
  productId: string;
  productName: string;
  currentStock: number;
  projectedStock: number;
  lineCount: number;
};

type StockBucketUpdate = StockBucketRow & { delta: number };

type ProductLite = { id: string; name: string };

type TabularPack = {
  kind: 'csv' | 'xlsx';
  headers: string[];
  rows: Record<string, unknown>[];
};

function conflictReasonLabel(reason: PreviewConflict['reason']): string {
  switch (reason) {
    case 'invalid_objectid':
      return 'ID interno inválido (formato MongoDB)';
    case 'mapped_product_missing':
      return 'Mapeamento aponta para produto que já não existe';
    default:
      return 'Código não encontrado — escolha o produto para mapear';
  }
}

function norm(v: unknown) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.length ? s : null;
}

function toNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

function legacyParsedFromXlsxRows(rows: Record<string, any>[]): ParsedItem[] {
  const out: ParsedItem[] = [];
  for (const r of rows) {
    const externalCode =
      norm(r.cProd) ||
      norm(r.CPROD) ||
      norm(r.codigo) ||
      norm(r.Codigo) ||
      norm(r['Código']) ||
      norm(r['ID']) ||
      norm(r['ID Código']) ||
      norm(r['IDCódigo']);

    const name = norm(r.xProd) || norm(r.Produto) || norm(r.produto) || norm(r.nome) || null;
    const quantity =
      parseLocaleNumber(r.qCom) ?? parseLocaleNumber(r.Quantidade) ?? parseLocaleNumber(r.quantidade);
    if (!externalCode || !quantity || quantity <= 0) continue;
    out.push({ externalCode, name, quantity });
  }
  return out;
}

function parseXlsx(file: File): Promise<ParsedItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        resolve(legacyParsedFromXlsxRows(rows));
      } catch (e: any) {
        reject(new Error(e?.message || 'Erro ao processar XLSX'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseNfeXml(text: string): ParsedItem[] {
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  const det = Array.from(dom.getElementsByTagName('det'));
  const out: ParsedItem[] = [];
  for (const d of det) {
    const prod = d.getElementsByTagName('prod')?.[0];
    if (!prod) continue;
    const externalCode = norm(prod.getElementsByTagName('cProd')?.[0]?.textContent);
    const name = norm(prod.getElementsByTagName('xProd')?.[0]?.textContent);
    const quantity = toNumber(prod.getElementsByTagName('qCom')?.[0]?.textContent);
    if (!externalCode && !name) continue;
    if (!quantity || quantity <= 0) continue;
    out.push({ externalCode, name, quantity });
  }
  return out;
}

type StockImporterProps = {
  showSubnav?: boolean;
};

/** Evita pdfjs no cliente (incompatível com Webpack dev do Next 14 + pdfjs 5.x). */
async function extractPdfTextViaApi(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/stock/extract-pdf-text', {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || data?.details || 'Erro ao extrair texto do PDF');
  }
  return String(data?.text ?? '');
}

/** Cabeçalhos de relatório LW / NF-e que não são códigos de produto. */
const PDF_STOCK_BOGUS_CODES = new Set(
  [
    'DATA',
    'HORA',
    'PAG',
    'PAGINA',
    'PÁGINA',
    'TOTAL',
    'SUBTOTAL',
    'CNPJ',
    'CPF',
    'IE',
    'NFE',
    'NF-E',
    'DANFE',
    'CHAVE',
    'PROTOCOLO',
    'EMISSAO',
    'EMISSÃO',
    'DESTINATARIO',
    'DESTINATÁRIO',
    'REMETENTE',
    'FRETE',
    'ICMS',
    'IPI',
    'PRODUTOS',
    'CODIGO',
    'CÓDIGO',
    'BARRAS',
    'STATUS',
    'ATIVO',
    'INATIVO',
    'RELATORIO',
    'RELATÓRIO',
  ].map((s) => s.toUpperCase()),
);

function isPdfStockNoiseLine(line: string): boolean {
  const t = line.trim();
  if (/^DATA\s*:/i.test(t)) return true;
  if (/^HORA\s*:/i.test(t)) return true;
  if (/^RELAT[OÓ]RIO\b/i.test(t) && !/^\d/.test(t)) return true;
  if (/^P[ÁA]G\.?\s*\d/i.test(t)) return true;
  if (/--\s*\d+\s+of\s+\d+\s*--/i.test(t)) return true;
  if (/relat[óo]rio.*produtos/i.test(t) && !/^\d/.test(t)) return true;
  return false;
}

function isBogusPdfStockCode(code: string): boolean {
  return PDF_STOCK_BOGUS_CODES.has(code.trim().toUpperCase());
}

function parsePdfDanfeText(text: string): ParsedItem[] {
  // Heurística para NF-e/DANFE em texto. Não usar com o PDF "Relatório de Produtos / Código de barras" LW
  // (esse ficheiro é para Admin → Produtos → Importar). Aqui filtramos linhas tipo DATA: dd/mm/aaaa.
  const normalized = String(text ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];

  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: ParsedItem[] = [];

  const qtyRegex = /(\d{1,3}(?:[.,]\d{1,6})?|\d{1,10})/g;
  const codeRegex = /([A-Za-z0-9]{3,30})/g;

  for (const line of lines) {
    if (out.length > 5000) break;

    if (line.length < 6) continue;
    if (isPdfStockNoiseLine(line)) continue;

    const qtyMatches = Array.from(line.matchAll(qtyRegex)).slice(0, 6).map((m) => m[1]);
    if (!qtyMatches.length) continue;

    const codeMatches = Array.from(line.matchAll(codeRegex)).slice(0, 10).map((m) => m[1]);
    const externalCode = codeMatches.find((c) => !isBogusPdfStockCode(c));
    if (!externalCode) continue;

    const qtyRaw = qtyMatches[0];
    const qtyStr = String(qtyRaw).replace(/\./g, '').replace(',', '.');
    const quantity = Number(qtyStr);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    out.push({ externalCode, name: null, quantity });
  }

  return out;
}

function splitCsvRow(row: string, delimiter: string): string[] {
  // Parse simples de CSV: respeita aspas duplas e delimitadores dentro de aspas.
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

function parseLocaleNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, ''); // remove separador milhar
  const normalized = cleaned.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseCsvText(text: string): ParsedItem[] {
  const rawLines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!rawLines.length) return [];

  const delimiter = detectDelimiter(rawLines[0]);
  const rows = rawLines.map((l) => splitCsvRow(l, delimiter));
  if (!rows.length) return [];

  const headerCells = rows[0].map((c) => String(c ?? '').toLowerCase());
  const hasHeader = headerCells.some((c) =>
    ['cprod', 'codigo', 'código', 'codigo_sistema', 'codigo_fornecedor', 'productid', 'idcodigo', 'id código', 'nome', 'xprod', 'qcom', 'quantidade', 'qtd', 'estoque', 'estoque_atual'].includes(c)
  );

  const dataRows = hasHeader ? rows.slice(1) : rows;

  const findColIndex = (candidates: string[]) => {
    for (const cand of candidates) {
      const idx = headerCells.findIndex((h) => h === cand || h.includes(cand));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const codeCol = hasHeader
    ? findColIndex(['cprod', 'codigo', 'código', 'codigo_sistema', 'codigo_fornecedor', 'productid', 'id', 'idcodigo', 'id código', 'id_codigo', 'produto_id', 'codigo sistema'])
    : 0;
  const qtyCol = hasHeader
    ? findColIndex(['qcom', 'quantidade', 'quantidade_comprada', 'quantidadecomprada', 'qtd', 'qtdcom', 'qtd_comprada', 'estoque', 'estoque_atual', 'qty'])
    : hasHeader
      ? 1
      : 1;
  const nameCol = hasHeader
    ? findColIndex(['xprod', 'produto', 'nome', 'descricao', 'descrição'])
    : -1;

  const out: ParsedItem[] = [];

  for (const r of dataRows) {
    const code = codeCol >= 0 ? norm(r[codeCol]) : null;
    const qty = qtyCol >= 0 ? parseLocaleNumber(r[qtyCol]) : null;
    const name = nameCol >= 0 ? norm(r[nameCol]) : null;

    // Se não tiver código, tenta usar a primeira coluna como fallback
    const externalCode = code ?? norm(r[0]);
    const quantity = qty;

    if (!externalCode || !quantity || quantity <= 0) continue;
    out.push({ externalCode, name, quantity });
  }
  return out;
}

export default function StockImporter({ showSubnav = true }: StockImporterProps) {
  const [source, setSource] = useState<Source>('xml');
  const [documentText, setDocumentText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<{
    documentHash: string | null;
    previewMode: 'add' | 'set';
    resolved: PreviewResolved[];
    conflicts: PreviewConflict[];
    willUpdate: StockBucketUpdate[];
    unchanged: StockBucketRow[];
    totals: {
      received: number;
      valid: number;
      resolved: number;
      conflicts: number;
      willUpdate: number;
      unchanged: number;
    };
  } | null>(null);
  const [lastPreviewPayload, setLastPreviewPayload] = useState<{
    items: ParsedItem[];
    fileTextForHash: string | null;
    preventDuplicateForThisRun: boolean;
  } | null>(null);
  const [columnHint, setColumnHint] = useState<string | null>(null);
  const [tabularContext, setTabularContext] = useState<TabularPack | null>(null);
  const [columnMappingUi, setColumnMappingUi] = useState<StockImportColumnMapping>({
    codigo: null,
    quantidade: null,
    nome: null,
  });
  const [importFingerprint, setImportFingerprint] = useState<string | null>(null);
  const [patternFromSaved, setPatternFromSaved] = useState(false);
  const [savingPattern, setSavingPattern] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, string>>({});
  const [preventDuplicate, setPreventDuplicate] = useState(true);
  /** add = somar quantidades ao estoque atual; set = substituir estoque pelo valor do ficheiro */
  const [stockApplyMode, setStockApplyMode] = useState<'add' | 'set'>('add');

  const parsedItems = useMemo(() => {
    if (source === 'csv') return parseCsvText(csvText);
    if (source === 'xml') return parseNfeXml(documentText);
    return [];
  }, [source, csvText, documentText]);

  const tabularHeaderOptions = useMemo(
    () => (tabularContext ? [...new Set(tabularContext.headers)] : []),
    [tabularContext]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      try {
        const res = await fetch('/api/products?limit=1000');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : [];
        const mapped = list
          .map((p: any) => ({ id: String(p.id), name: String(p.name) }))
          .filter((p: any) => p.id && p.name);
        if (!cancelled) setProducts(mapped);
      } catch {
        // silent
      }
    }
    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runPreview(
    items: ParsedItem[],
    fileTextForHash: string | null,
    preventDuplicateForThisRun: boolean,
    modeArg?: 'add' | 'set'
  ) {
    if (!items.length) return toast.error('Nenhum item válido para prévia');
    setLastPreviewPayload({ items, fileTextForHash, preventDuplicateForThisRun });
    const mode = modeArg ?? stockApplyMode;
    setLoadingPreview(true);
    setPreview(null);
    setConflictResolutions({});
    try {
      const res = await fetch('/api/admin/stock/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          preventDuplicate: preventDuplicateForThisRun && source === 'xml',
          documentText: source === 'xml' ? fileTextForHash : null,
          items,
          mode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        throw new Error('Este XML já foi importado anteriormente (dedupe ativo).');
      }
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar prévia');
      setPreview({
        documentHash: data?.documentHash ?? null,
        previewMode: data?.mode === 'set' ? 'set' : 'add',
        resolved: Array.isArray(data?.resolved) ? data.resolved : [],
        conflicts: Array.isArray(data?.conflicts) ? data.conflicts : [],
        willUpdate: Array.isArray(data?.willUpdate) ? data.willUpdate : [],
        unchanged: Array.isArray(data?.unchanged) ? data.unchanged : [],
        totals: data?.totals ?? {
          received: 0,
          valid: 0,
          resolved: 0,
          conflicts: 0,
          willUpdate: 0,
          unchanged: 0,
        },
      });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar prévia');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function onUploadFile(file: File) {
    // Mantido por compatibilidade (quando selecionado 1 arquivo).
    void onUploadFiles([file]);
  }

  async function parseUploadedFiles(files: File[]): Promise<{
    items: ParsedItem[];
    fileTextForHash: string | null;
    preventDuplicateForThisRun: boolean;
    columnHint: string | null;
    tabular: TabularPack | null;
  }> {
    const allItems: ParsedItem[] = [];
    let columnHintLocal: string | null = null;
    let tabularLocal: TabularPack | null = null;
    let xmlTextForHash: string | null = null;
    // dedupe só faz sentido quando for 1 arquivo XML
    const onlySingleXml = (() => {
      if (!preventDuplicate || files.length !== 1) return false;
      const ext = files[0].name.split('.').pop()?.toLowerCase();
      return ext === 'xml';
    })();
    const preventDuplicateForThisRun = onlySingleXml;

    const single = files.length === 1;

    for (const file of files) {
      if (importFileTooLarge(file)) {
        throw new Error(`"${file.name}" demasiado grande (máx. ${MAX_IMPORT_FILE_DESC})`);
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xml') {
        const text = await file.text();
        if (preventDuplicateForThisRun && !xmlTextForHash) xmlTextForHash = text;
        allItems.push(...parseNfeXml(text));
      } else if (ext === 'csv') {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/).find((l) => String(l).trim()) ?? '';
        if (firstLine && !columnHintLocal) {
          const delim = detectDelimiter(firstLine);
          const cells = splitCsvRow(String(firstLine), delim)
            .map((c) => c.trim())
            .filter(Boolean);
          if (cells.length) columnHintLocal = formatGuessedMappingLabel(guessStockImportColumns(cells));
        }
        const legacyCsv = parseCsvText(text);
        allItems.push(...legacyCsv);
        if (single && !tabularLocal) {
          const tab = tryParseCsvAsObjects(text);
          if (tab?.headers.length && tab.rows.length) {
            tabularLocal = { kind: 'csv', headers: tab.headers, rows: tab.rows };
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        let wb: XLSX.WorkBook;
        try {
          wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        } catch (readErr) {
          const m = readErr instanceof Error ? readErr.message : String(readErr);
          if (
            ext === 'xls' &&
            (/0xfd|truncated|labelsst/i.test(m) || /record.*0x/i.test(m))
          ) {
            throw new Error(
              `${m}\n\nEste .xls vem com BIFF inválido (comum em exportações antigas). ` +
                'Abra no Excel ou LibreOffice, guarde como .xlsx e volte a importar — ou use a importação de catálogo no servidor (API admin), que tenta converter automaticamente.'
            );
          }
          throw readErr instanceof Error ? readErr : new Error(String(readErr));
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (!columnHintLocal && rows[0]) {
          const keys = Object.keys(rows[0] as object).map(String).filter(Boolean);
          if (keys.length) columnHintLocal = formatGuessedMappingLabel(guessStockImportColumns(keys));
        }
        allItems.push(...legacyParsedFromXlsxRows(rows));
        if (single && rows.length && rows[0]) {
          const keys = Object.keys(rows[0] as object).map(String).filter(Boolean);
          if (keys.length) {
            tabularLocal = { kind: 'xlsx', headers: keys, rows: rows as Record<string, unknown>[] };
          }
        }
      } else {
        // PDF: texto extraído no servidor (pdfjs fora do bundle do cliente)
        if (ext === 'pdf') {
          const text = await extractPdfTextViaApi(file);
          const parsed = parsePdfDanfeText(text);
          allItems.push(...parsed);
        }
      }
    }

    if (!single) tabularLocal = null;

    return {
      items: allItems,
      fileTextForHash: xmlTextForHash,
      preventDuplicateForThisRun,
      columnHint: columnHintLocal,
      tabular: tabularLocal,
    };
  }

  async function reprocessTabularPreview(
    rows: Record<string, unknown>[],
    mapping: StockImportColumnMapping
  ) {
    if (!mapping.codigo || !mapping.quantidade) {
      setPreview(null);
      return;
    }
    const dynamic = rowsToParsedItems(rows, mapping);
    if (!dynamic.length) {
      if (mapping.codigo && mapping.quantidade) {
        toast.error('Nenhuma linha válida com este mapeamento (verifique células vazias ou formatos numéricos).');
      }
      setPreview(null);
      return;
    }
    await runPreview(dynamic, null, false);
  }

  async function saveImportPattern() {
    if (!tabularContext?.headers.length) return;
    if (!columnMappingUi.codigo || !columnMappingUi.quantidade) {
      toast.error('Defina colunas de código e quantidade antes de guardar.');
      return;
    }
    setSavingPattern(true);
    try {
      const res = await fetch('/api/admin/stock/import/pattern', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          headers: tabularContext.headers,
          mapping: columnMappingUi,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Falha ao guardar');
      toast.success(typeof data?.message === 'string' ? data.message : 'Mapeamento guardado.');
      setPatternFromSaved(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSavingPattern(false);
    }
  }

  /**
   * Consulta `import_patterns`, preenche mapeamento na UI e gera prévia (com fallback para leitor clássico).
   * @returns false se não houver itens válidos após o mapeamento
   */
  async function lookupPatternAndPreviewTabular(
    tabular: TabularPack,
    legacyItems: ParsedItem[],
    fileTextForHash: string | null,
    preventDuplicateForThisRun: boolean
  ): Promise<boolean> {
    setTabularContext(tabular);
    const pr = await fetch('/api/admin/stock/import/pattern', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'lookup',
        headers: tabular.headers,
      }),
    });
    const pdata = await pr.json().catch(() => null);
    if (!pr.ok) throw new Error(pdata?.error || 'Falha ao consultar mapeamento guardado');
    const mapping = pdata.mapping as StockImportColumnMapping;
    setColumnMappingUi(mapping);
    setImportFingerprint(typeof pdata.fingerprint === 'string' ? pdata.fingerprint : null);
    setPatternFromSaved(Boolean(pdata.fromSavedPattern));

    let items = rowsToParsedItems(tabular.rows, mapping);
    if (!items.length && legacyItems.length) {
      items = legacyItems;
      toast.message('O mapeamento não gerou linhas — foi usado o leitor clássico.');
    }
    if (!items.length) {
      toast.error('Nenhum item válido encontrado nos arquivos');
      return false;
    }
    await runPreview(items, fileTextForHash, preventDuplicateForThisRun);
    return true;
  }

  async function onUploadFiles(files: File[]) {
    if (!files.length) return;
    setSelectedFiles(files);
    try {
      setLoadingPreview(true);
      setPreview(null);
      setConflictResolutions({});
      setTabularContext(null);
      setImportFingerprint(null);
      setPatternFromSaved(false);

      const parsed = await parseUploadedFiles(files);
      setColumnHint(parsed.columnHint);

      const ext0 = files[0].name.split('.').pop()?.toLowerCase();
      if (ext0 === 'csv') setSource('csv');
      else if (ext0 === 'xlsx' || ext0 === 'xls') setSource('xlsx');
      else if (ext0 === 'xml') setSource('xml');
      else if (ext0 === 'pdf') setSource('pdf');

      if (parsed.tabular) {
        const ok = await lookupPatternAndPreviewTabular(
          parsed.tabular,
          parsed.items,
          parsed.fileTextForHash,
          parsed.preventDuplicateForThisRun
        );
        if (!ok) return;
        return;
      }

      if (!parsed.items.length) {
        toast.error('Nenhum item válido encontrado nos arquivos');
        return;
      }
      await runPreview(parsed.items, parsed.fileTextForHash, parsed.preventDuplicateForThisRun);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar arquivos');
    } finally {
      setLoadingPreview(false);
    }
  }

  /** CSV colado na textarea: mesmo fluxo de cabeçalhos + `import_patterns` que no upload de ficheiro. */
  async function runCsvPastePreview() {
    setLoadingPreview(true);
    setPreview(null);
    setConflictResolutions({});
    setTabularContext(null);
    setImportFingerprint(null);
    setPatternFromSaved(false);
    setSource('csv');
    try {
      const tab = tryParseCsvAsObjects(csvText);
      const legacy = parseCsvText(csvText);
      const firstLine = csvText.split(/\r?\n/).find((l) => String(l).trim()) ?? '';
      let hint: string | null = null;
      if (firstLine) {
        const delim = detectDelimiter(firstLine);
        const cells = splitCsvRow(String(firstLine), delim)
          .map((c) => c.trim())
          .filter(Boolean);
        if (cells.length) hint = formatGuessedMappingLabel(guessStockImportColumns(cells));
      }
      setColumnHint(hint);

      if (tab?.headers.length && tab.rows.length) {
        const ok = await lookupPatternAndPreviewTabular(
          { kind: 'csv', headers: tab.headers, rows: tab.rows },
          legacy,
          null,
          false
        );
        if (!ok) return;
        return;
      }

      if (!legacy.length) {
        toast.error('Nenhum item válido para prévia');
        return;
      }
      await runPreview(legacy, null, false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar prévia');
    } finally {
      setLoadingPreview(false);
    }
  }

  // Suporte a PDF: adicionamos um botão/fluxo específico.
  async function onUploadPdfFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    // O reconhecimento é via itens (parse heurístico do PDF). Dedupe fica desativado para multi-arquivos.
    setSource('pdf');
    await onUploadFiles(list);
  }

  async function applyImport() {
    if (!preview) return;
    if (preview.conflicts.length) {
      // exige resolução
      const missing = preview.conflicts.filter((_, idx) => {
        const key = `idx:${idx}`;
        return !conflictResolutions[key];
      });
      if (missing.length) {
        return toast.error('Resolva todos os conflitos antes de aplicar.');
      }
    }

    const resolvedItems = [
      ...preview.resolved.map((r) => ({
        productId: r.productId,
        externalCode: r.externalCode,
        quantity: r.quantity,
      })),
      ...preview.conflicts.map((c, idx) => {
        const key = `idx:${idx}`;
        return {
          productId: conflictResolutions[key],
          externalCode: c.externalCode,
          quantity: c.quantity,
        };
      }),
    ];

    const mappingsToUpsert = preview.conflicts
      .map((c, idx) => {
        const code = c.externalCode;
        if (!code) return null;
        const key = `idx:${idx}`;
        const productId = conflictResolutions[key];
        if (!productId) return null;
        return { externalCode: code, productId, source: source === 'xml' ? 'nfe_xml' : source };
      })
      .filter(Boolean);

    setApplying(true);
    try {
      const res = await fetch('/api/admin/stock/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          mode: stockApplyMode,
          documentHash: preview.documentHash,
          items: resolvedItems,
          mappingsToUpsert,
          enrichProducts: false,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Falha ao aplicar importação');
      void fetch('/api/admin/catalog/enrichment-queue/kick', {
        method: 'POST',
        credentials: 'include',
      })
        .then((r) => r.json().catch(() => null))
        .then((j) => {
          if (j?.warning && typeof j.warning === 'string') toast.message(j.warning);
        })
        .catch(() => {
          /* fila opcional */
        });
      toast.success(
        `Importação aplicada: ${data?.applied ?? 0} ajustes. Enriquecimento por IA (produtos ativos com EAN) foi enfileirado em segundo plano — veja Pendentes (IA).`
      );
      setPreview(null);
      setLastPreviewPayload(null);
      setColumnHint(null);
      setTabularContext(null);
      setImportFingerprint(null);
      setPatternFromSaved(false);
      setCsvText('');
      setDocumentText('');
      setConflictResolutions({});
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao aplicar importação');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importação de estoque</h1>
        <p className="text-gray-600 mt-1">
          Catálogo com agente IA (acima) ou importação clássica de movimentos de estoque (NF-e, CSV, XLSX, PDF). Após
          aplicar, o enriquecimento por IA corre em segundo plano para produtos <strong>ativos</strong> com{' '}
          <strong>código de barras válido</strong> — acompanhe em <strong>Pendentes (IA)</strong>.
        </p>
      </div>

      {showSubnav ? <StockSubnav /> : null}

      <ImportacaoEstoqueModal />

      <Card id={IMPORTACAO_ESTOQUE_CLASSICA_ID} className="p-4 space-y-4 scroll-mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-medium">Fonte</div>
            <Select value={source} onValueChange={(v) => setSource(v as Source)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xml">XML (NF-e)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Upload de arquivo</div>
            <Input
              type="file"
              accept=".xml,.csv,.xlsx,.xls,.pdf"
              multiple
              onChange={(e) => {
                const list = e.target.files;
                if (!list?.length) return;
                // Se for PDF, usamos heurística.
                const hasPdf = Array.from(list).some((f) => f.name.toLowerCase().endsWith('.pdf'));
                if (hasPdf) {
                  void onUploadPdfFiles(list);
                } else {
                  void onUploadFiles(Array.from(list));
                }
                e.currentTarget.value = '';
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={preventDuplicate}
              onChange={(e) => setPreventDuplicate(e.target.checked)}
            />
            Evitar duplicar XML (dedupe por hash)
          </label>
        </div>

        {source === 'xml' ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Ou cole o XML</div>
            <Textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} rows={10} />
            <Button
              variant="outline"
              onClick={() => {
                setTabularContext(null);
                setImportFingerprint(null);
                setPatternFromSaved(false);
                void runPreview(parseNfeXml(documentText), documentText, preventDuplicate);
              }}
              disabled={loadingPreview}
            >
              {loadingPreview ? 'Gerando prévia...' : 'Prévia do XML'}
            </Button>
          </div>
        ) : source === 'csv' ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Ou cole o CSV</div>
            <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={10} />
            <div className="text-xs text-gray-500">Linhas válidas detectadas: {parsedItems.length}</div>
            <Button
              variant="outline"
              onClick={() => void runCsvPastePreview()}
              disabled={loadingPreview}
            >
              {loadingPreview ? 'Gerando prévia...' : 'Prévia do CSV'}
            </Button>
          </div>
        ) : source === 'pdf' ? (
          <div className="text-sm text-gray-600">
            PDF aqui é para texto tipo <strong>NF-e / DANFE</strong>. O relatório{' '}
            <em>Relatório de Produtos / Código de barras LW</em> não deve ser usado neste módulo — importe-o
            em <strong>Admin → Produtos → Importar</strong> para atualizar o catálogo.
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Para XLSX, use o upload acima. (Leitura do primeiro sheet.)
          </div>
        )}

        {columnHint ? (
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-800">Colunas detetadas:</span> {columnHint}
          </p>
        ) : null}
      </Card>

      {tabularContext && tabularHeaderOptions.length ? (
        <Card className="space-y-4 border-dashed border-slate-400/60 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Mapeamento de colunas (CSV / XLSX)</div>
              <p className="mt-1 text-xs text-slate-600">
                O sistema memoriza o formato pelo conjunto de cabeçalhos
                {importFingerprint ? (
                  <span className="font-mono text-slate-500"> ({importFingerprint.slice(0, 10)}…)</span>
                ) : null}
                . Ajuste as colunas e guarde para reutilizar automaticamente na próxima vez.
              </p>
              {patternFromSaved ? (
                <p className="mt-1 text-xs font-medium text-emerald-800">
                  Existe um mapeamento guardado na base para este formato.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={savingPattern || !columnMappingUi.codigo || !columnMappingUi.quantidade}
              onClick={() => void saveImportPattern()}
            >
              {savingPattern ? 'A guardar…' : 'Guardar mapeamento'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">Coluna do código / referência</div>
              <Select
                value={
                  columnMappingUi.codigo && tabularHeaderOptions.includes(columnMappingUi.codigo)
                    ? columnMappingUi.codigo
                    : '__none__'
                }
                onValueChange={(v) => {
                  const codigo = v === '__none__' ? null : v;
                  setColumnMappingUi((prev) => {
                    const next = { ...prev, codigo };
                    queueMicrotask(() =>
                      void reprocessTabularPreview(tabularContext.rows, next)
                    );
                    return next;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {tabularHeaderOptions.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">Coluna da quantidade / stock</div>
              <Select
                value={
                  columnMappingUi.quantidade && tabularHeaderOptions.includes(columnMappingUi.quantidade)
                    ? columnMappingUi.quantidade
                    : '__none__'
                }
                onValueChange={(v) => {
                  const quantidade = v === '__none__' ? null : v;
                  setColumnMappingUi((prev) => {
                    const next = { ...prev, quantidade };
                    queueMicrotask(() =>
                      void reprocessTabularPreview(tabularContext.rows, next)
                    );
                    return next;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {tabularHeaderOptions.map((h) => (
                    <SelectItem key={`q-${h}`} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">Coluna do nome (opcional)</div>
              <Select
                value={
                  columnMappingUi.nome && tabularHeaderOptions.includes(columnMappingUi.nome)
                    ? columnMappingUi.nome
                    : '__none__'
                }
                onValueChange={(v) => {
                  const nome = v === '__none__' ? null : v;
                  setColumnMappingUi((prev) => {
                    const next = { ...prev, nome };
                    queueMicrotask(() =>
                      void reprocessTabularPreview(tabularContext.rows, next)
                    );
                    return next;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {tabularHeaderOptions.map((h) => (
                    <SelectItem key={`n-${h}`} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <div className="font-semibold">Prévia</div>
              <div className="text-sm text-gray-600">
                Válidos: {preview.totals.valid} · Linhas no ficheiro com produto na base: {preview.totals.resolved} ·
                Sem correspondência: {preview.totals.conflicts} · Stock a alterar: {preview.totals.willUpdate} · Sem
                alteração de stock: {preview.totals.unchanged}
              </div>
              {preview.documentHash ? (
                <div className="text-xs text-gray-500">documentHash: {preview.documentHash.slice(0, 12)}…</div>
              ) : null}
            </div>
            <fieldset className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
              <legend className="px-1 text-sm font-medium text-gray-900">Como aplicar ao estoque</legend>
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="stockApplyMode"
                  className="mt-1"
                  checked={stockApplyMode === 'add'}
                  onChange={() => {
                    setStockApplyMode('add');
                    if (lastPreviewPayload?.items.length) {
                      void runPreview(
                        lastPreviewPayload.items,
                        lastPreviewPayload.fileTextForHash,
                        lastPreviewPayload.preventDuplicateForThisRun,
                        'add'
                      );
                    }
                  }}
                />
                <span>
                  <strong>Somar ao estoque atual</strong> — cada quantidade do ficheiro é <em>acrescentada</em>{' '}
                  ao que já está na base (ex.: entrada de mercadoria / NF-e).
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="stockApplyMode"
                  className="mt-1"
                  checked={stockApplyMode === 'set'}
                  onChange={() => {
                    setStockApplyMode('set');
                    if (lastPreviewPayload?.items.length) {
                      void runPreview(
                        lastPreviewPayload.items,
                        lastPreviewPayload.fileTextForHash,
                        lastPreviewPayload.preventDuplicateForThisRun,
                        'set'
                      );
                    }
                  }}
                />
                <span>
                  <strong>Definir estoque</strong> — <em>substitui</em> o estoque do produto pelo valor do ficheiro
                  (não soma).
                </span>
              </label>
            </fieldset>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button onClick={() => void applyImport()} disabled={applying}>
                {applying
                  ? 'Aplicando...'
                  : stockApplyMode === 'add'
                    ? 'Aplicar importação (somar ao estoque)'
                    : 'Aplicar importação (definir estoque)'}
              </Button>
            </div>
          </Card>

          <Tabs
            defaultValue={preview.conflicts.length ? 'novos' : preview.willUpdate.length ? 'atualizados' : 'inalterados'}
            className="w-full"
          >
            <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="novos">
                Dados novos ({preview.conflicts.length})
              </TabsTrigger>
              <TabsTrigger value="atualizados">
                Atualizados ({preview.willUpdate.length})
              </TabsTrigger>
              <TabsTrigger value="inalterados">
                Já na base (sem mudar stock) ({preview.unchanged.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="novos" className="mt-4">
              <Card className="p-4">
                <div className="font-semibold text-sm text-gray-900">
                  Linhas sem produto correspondente na loja
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Códigos que ainda não mapeiam para um produto (ou ID inválido). Resolva com o seletor abaixo antes de
                  aplicar.
                </p>
                {!preview.conflicts.length ? (
                  <p className="mt-4 text-sm text-gray-500">Nenhuma linha nesta situação.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {preview.conflicts.map((c, idx) => {
                      const key = `idx:${idx}`;
                      return (
                        <div key={`${key}::${idx}`} className="rounded-lg border p-3">
                          <div className="text-sm text-gray-700">
                            <span className="font-semibold">Código:</span> {c.externalCode || '—'} ·{' '}
                            <span className="font-semibold">Nome:</span> {c.name || '—'} ·{' '}
                            <span className="font-semibold">Qtd:</span> {c.quantity} ·{' '}
                            <span className="font-semibold">Motivo:</span> {conflictReasonLabel(c.reason)}
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <Select
                              value={conflictResolutions[key] ?? ''}
                              onValueChange={(v) => setConflictResolutions((prev) => ({ ...prev, [key]: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o produto do site" />
                              </SelectTrigger>
                              <SelectContent>
                                {products
                                  .slice()
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <div className="text-xs text-gray-500">
                              Ao aplicar, este código será salvo no mapeamento para as próximas importações.
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="atualizados" className="mt-4">
              <Card className="p-4">
                <div className="font-semibold text-sm">Produtos cujo stock vai mudar</div>
                <p className="mt-1 text-xs text-gray-600">
                  Comparação com o stock atual na base, em modo{' '}
                  <strong>{preview.previewMode === 'set' ? 'definir' : 'somar'}</strong>.
                </p>
                {!preview.willUpdate.length ? (
                  <p className="mt-4 text-sm text-gray-500">Nenhuma alteração de stock prevista.</p>
                ) : (
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto divide-y">
                    {preview.willUpdate.map((r) => (
                      <div key={r.productId} className="py-2 text-sm">
                        <div className="font-medium text-gray-900">{r.productName}</div>
                        <div className="text-gray-600">
                          Stock atual: {r.currentStock} → previsto: {r.projectedStock}{' '}
                          <span className={r.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            ({r.delta >= 0 ? '+' : ''}
                            {r.delta})
                          </span>
                          {r.lineCount > 1 ? (
                            <span className="text-xs text-gray-500"> · {r.lineCount} linhas no ficheiro</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="inalterados" className="mt-4">
              <Card className="p-4">
                <div className="font-semibold text-sm">Já na base — stock igual ao previsto</div>
                <p className="mt-1 text-xs text-gray-600">
                  O ficheiro identifica estes produtos, mas o stock final coincide com o que já está gravado (nada a
                  gravar para eles).
                </p>
                {!preview.unchanged.length ? (
                  <p className="mt-4 text-sm text-gray-500">Nenhum produto nesta situação.</p>
                ) : (
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto divide-y">
                    {preview.unchanged.map((r) => (
                      <div key={r.productId} className="py-2 text-sm">
                        <div className="font-medium text-gray-900">{r.productName}</div>
                        <div className="text-gray-600">
                          Stock: {r.currentStock}
                          {r.lineCount > 1 ? (
                            <span className="text-xs text-gray-500"> · {r.lineCount} linhas agregadas</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}

