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

type ProductLite = { id: string; name: string };

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

function parseXlsx(file: File): Promise<ParsedItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        // tenta colunas comuns
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

          const name =
            norm(r.xProd) ||
            norm(r.Produto) ||
            norm(r.produto) ||
            norm(r.nome) ||
            norm(r.Nome) ||
            norm(r['Descrição']) ||
            norm(r['Descricao']);

          const quantity =
            toNumber(r.qCom) ||
            toNumber(r.Quantidade) ||
            toNumber(r.quantidade) ||
            toNumber(r.Estoque) ||
            toNumber(r.estoque);

          if (!externalCode && !name) continue;
          if (!quantity || quantity <= 0) continue;
          out.push({ externalCode, name, quantity });
        }
        resolve(out);
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
    resolved: PreviewResolved[];
    conflicts: PreviewConflict[];
    totals: { received: number; valid: number; resolved: number; conflicts: number };
  } | null>(null);
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

  async function runPreview(items: ParsedItem[], fileTextForHash: string | null, preventDuplicateForThisRun: boolean) {
    if (!items.length) return toast.error('Nenhum item válido para prévia');
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
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        throw new Error('Este XML já foi importado anteriormente (dedupe ativo).');
      }
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar prévia');
      setPreview({
        documentHash: data?.documentHash ?? null,
        resolved: Array.isArray(data?.resolved) ? data.resolved : [],
        conflicts: Array.isArray(data?.conflicts) ? data.conflicts : [],
        totals: data?.totals ?? { received: 0, valid: 0, resolved: 0, conflicts: 0 },
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

  async function parseUploadedFiles(files: File[]): Promise<{ items: ParsedItem[]; fileTextForHash: string | null; preventDuplicateForThisRun: boolean }> {
    const allItems: ParsedItem[] = [];
    let xmlTextForHash: string | null = null;
    // dedupe só faz sentido quando for 1 arquivo XML
    const onlySingleXml = (() => {
      if (!preventDuplicate || files.length !== 1) return false;
      const ext = files[0].name.split('.').pop()?.toLowerCase();
      return ext === 'xml';
    })();
    const preventDuplicateForThisRun = onlySingleXml;

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
        allItems.push(...parseCsvText(text));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
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
          const quantity = parseLocaleNumber(r.qCom) ?? parseLocaleNumber(r.Quantidade) ?? parseLocaleNumber(r.quantidade);
          if (!externalCode || !quantity || quantity <= 0) continue;
          allItems.push({ externalCode, name, quantity });
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

    return { items: allItems, fileTextForHash: xmlTextForHash, preventDuplicateForThisRun };
  }

  async function onUploadFiles(files: File[]) {
    if (!files.length) return;
    setSelectedFiles(files);
    try {
      setLoadingPreview(true);
      setPreview(null);
      setConflictResolutions({});

      const { items, fileTextForHash, preventDuplicateForThisRun } = await parseUploadedFiles(files);
      if (!items.length) {
        toast.error('Nenhum item válido encontrado nos arquivos');
        return;
      }
      await runPreview(items, fileTextForHash, preventDuplicateForThisRun);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar arquivos');
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
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Falha ao aplicar importação');
      toast.success(`Importação aplicada: ${data?.applied ?? 0} ajustes`);
      setPreview(null);
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
          CSV/XLSX/XML (NF-e). Faz prévia, tenta reconhecer por ObjectId ou mapeamento, e permite resolver conflitos.
        </p>
      </div>

      {showSubnav ? <StockSubnav /> : null}

      <Card className="p-4 space-y-4">
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
              onClick={() => void runPreview(parseNfeXml(documentText), documentText, preventDuplicate)}
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
              onClick={() => void runPreview(parseCsvText(csvText), null, false)}
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
      </Card>

      {preview ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <div className="font-semibold">Prévia</div>
              <div className="text-sm text-gray-600">
                Válidos: {preview.totals.valid} · Resolvidos: {preview.totals.resolved} · Conflitos:{' '}
                {preview.totals.conflicts}
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
                  onChange={() => setStockApplyMode('add')}
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
                  onChange={() => setStockApplyMode('set')}
                />
                <span>
                  <strong>Definir estoque</strong> — <em>substitui</em> o estoque do produto pelo valor do
                  ficheiro (não soma).
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

          {preview.conflicts.length ? (
            <Card className="p-4">
              <div className="font-semibold">Conflitos</div>
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
            </Card>
          ) : null}

          {preview.resolved.length ? (
            <Card className="p-4">
              <div className="font-semibold">Itens reconhecidos</div>
              <div className="mt-3 divide-y">
                {preview.resolved.slice(0, 20).map((r, idx) => (
                  <div key={`${r.productId}::${idx}`} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{r.productName}</div>
                      <div className="text-sm text-gray-600">
                        {stockApplyMode === 'add' ? '+' : '='}
                        {r.quantity} · {r.externalCode ? `código: ${r.externalCode}` : 'sem código'} ·{' '}
                        {r.resolution}
                      </div>
                    </div>
                  </div>
                ))}
                {preview.resolved.length > 20 ? (
                  <div className="pt-3 text-xs text-gray-500">
                    Mostrando 20 de {preview.resolved.length} itens reconhecidos.
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

