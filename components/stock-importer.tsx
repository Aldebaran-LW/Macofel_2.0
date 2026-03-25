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

type Source = 'csv' | 'xlsx' | 'xml';

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

function norm(v: unknown) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.length ? s : null;
}

function toNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseCsvText(text: string): ParsedItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // tenta detectar header
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('codigo') || first.includes('cprod') || first.includes('produto') || first.includes('nome');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const out: ParsedItem[] = [];
  for (const line of dataLines) {
    const parts = line.split(';').length > line.split(',').length ? line.split(';') : line.split(',');
    const a = norm(parts[0]);
    const b = norm(parts[1]);
    const c = norm(parts[2]);

    // formatos suportados:
    // 1) codigo,quantidade
    // 2) codigo,nome,quantidade
    const externalCode = a;
    let name: string | null = null;
    let quantity: number | null = null;

    if (c !== null) {
      name = b;
      quantity = toNumber(c);
    } else {
      quantity = toNumber(b);
    }

    if (!externalCode && !name) continue;
    if (!quantity || quantity <= 0) continue;

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
  baseHref: '/admin/estoque' | '/admin/master/estoque';
};

export default function StockImporter({ baseHref }: StockImporterProps) {
  const [source, setSource] = useState<Source>('xml');
  const [documentText, setDocumentText] = useState('');
  const [csvText, setCsvText] = useState('');
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

  async function runPreview(items: ParsedItem[], fileTextForHash: string | null) {
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
          preventDuplicate: preventDuplicate && source === 'xml',
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
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'xlsx' || ext === 'xls') {
        setSource('xlsx');
        const items = await parseXlsx(file);
        // para XLSX não fazemos hash/dedupe nesta versão
        await runPreview(items, null);
      } else if (ext === 'csv') {
        setSource('csv');
        const text = await file.text();
        setCsvText(text);
        await runPreview(parseCsvText(text), null);
      } else if (ext === 'xml') {
        setSource('xml');
        const text = await file.text();
        setDocumentText(text);
        await runPreview(parseNfeXml(text), text);
      } else {
        toast.error('Formato não suportado. Use CSV, XLSX ou XML.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar arquivo');
    }
  }

  async function applyImport() {
    if (!preview) return;
    if (preview.conflicts.length) {
      // exige resolução
      const missing = preview.conflicts.filter((c) => {
        const key = `${c.externalCode ?? ''}::${c.name ?? ''}::${c.quantity}`;
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
      ...preview.conflicts.map((c) => {
        const key = `${c.externalCode ?? ''}::${c.name ?? ''}::${c.quantity}`;
        return {
          productId: conflictResolutions[key],
          externalCode: c.externalCode,
          quantity: c.quantity,
        };
      }),
    ];

    const mappingsToUpsert = preview.conflicts
      .map((c) => {
        const code = c.externalCode;
        if (!code) return null;
        const key = `${c.externalCode ?? ''}::${c.name ?? ''}::${c.quantity}`;
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
          mode: 'add',
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

      <StockSubnav baseHref={baseHref} />

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
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Upload de arquivo</div>
            <Input
              type="file"
              accept=".xml,.csv,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUploadFile(f);
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
              onClick={() => void runPreview(parseNfeXml(documentText), documentText)}
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
              onClick={() => void runPreview(parseCsvText(csvText), null)}
              disabled={loadingPreview}
            >
              {loadingPreview ? 'Gerando prévia...' : 'Prévia do CSV'}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Para XLSX, use o upload acima. (Leitura do primeiro sheet.)
          </div>
        )}
      </Card>

      {preview ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
              <Button onClick={() => void applyImport()} disabled={applying}>
                {applying ? 'Aplicando...' : 'Aplicar importação (somar no estoque)'}
              </Button>
            </div>
          </Card>

          {preview.conflicts.length ? (
            <Card className="p-4">
              <div className="font-semibold">Conflitos</div>
              <div className="mt-3 space-y-3">
                {preview.conflicts.map((c, idx) => {
                  const key = `${c.externalCode ?? ''}::${c.name ?? ''}::${c.quantity}`;
                  return (
                    <div key={`${key}::${idx}`} className="rounded-lg border p-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Código:</span> {c.externalCode || '—'} ·{' '}
                        <span className="font-semibold">Nome:</span> {c.name || '—'} ·{' '}
                        <span className="font-semibold">Qtd:</span> {c.quantity} ·{' '}
                        <span className="font-semibold">Motivo:</span> {c.reason}
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
                        +{r.quantity} · {r.externalCode ? `código: ${r.externalCode}` : 'sem código'} · {r.resolution}
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

