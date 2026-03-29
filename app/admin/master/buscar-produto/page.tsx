'use client';

import { useMemo, useState } from 'react';
import { Search, Copy, Check, Loader2, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BuscarProdutoResponse } from '@/lib/buscar-produto-types';

type BatchPreviewRow = {
  id: string;
  name: string;
  codBarra: string | null;
  canApply: boolean;
  reason?: string;
  source?: string;
  resolvedTitle?: string;
  matched_ean?: string | null;
  patch?: {
    imageUrl?: string;
    imageUrls?: string[];
    weight?: number;
    dimensionsCm?: string;
  };
};

export default function MasterBuscarProdutoPage() {
  const [mode, setMode] = useState<'name' | 'ean'>('name');
  const [q, setQ] = useState('');
  const [eanNameHint, setEanNameHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [result, setResult] = useState<BuscarProdutoResponse | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchPreviewRow[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  /** Voltar a pesquisar produtos que já entraram num lote (APIs) anteriormente. */
  const [batchIncludeRechecked, setBatchIncludeRechecked] = useState(false);
  const [batchCatalog, setBatchCatalog] = useState<'active' | 'inactive' | 'all'>('active');

  const buscar = async () => {
    const term = q.trim();
    if (!term) {
      toast.error(mode === 'ean' ? 'Indique o código de barras' : 'Indique o nome do produto');
      return;
    }
    setLoading(true);
    setResult(null);
    setBatchSummary(null);
    try {
      const url =
        mode === 'ean'
          ? `/api/buscar-produto?ean=${encodeURIComponent(term)}${
              eanNameHint.trim() ? `&nameHint=${encodeURIComponent(eanNameHint.trim())}` : ''
            }`
          : `/api/buscar-produto?q=${encodeURIComponent(term)}`;
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Falha na pesquisa');
        return;
      }
      setResult(data as BuscarProdutoResponse);
      toast.success('Resultado obtido');
    } catch {
      toast.error('Erro de rede');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = useMemo(() => {
    if (!batchRows) return 0;
    return batchRows.filter((r) => r.canApply && selected[r.id]).length;
  }, [batchRows, selected]);

  const runBatchPreview = async () => {
    setBatchLoading(true);
    setBatchSummary(null);
    setBatchRows(null);
    try {
      const res = await fetch('/api/admin/master/products-enrich-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          limit: 50,
          onlyIfMissing: true,
          catalog: batchCatalog,
          skipAlreadyChecked: !batchIncludeRechecked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Falha no lote');
        return;
      }
      const rows = Array.isArray(data.results) ? (data.results as BatchPreviewRow[]) : [];
      setBatchRows(rows);
      const sel: Record<string, boolean> = {};
      for (const r of rows) {
        if (r.canApply) sel[r.id] = true;
      }
      setSelected(sel);
      const prop = typeof data.withProposal === 'number' ? data.withProposal : rows.filter((r) => r.canApply).length;
      const proc = typeof data.processed === 'number' ? data.processed : rows.length;
      setBatchSummary(`${proc} analisados · ${prop} com dados para gravar (revê na caixa).`);
      setBatchDialogOpen(true);
      if (prop === 0) {
        toast.message('Nenhum produto com proposta de enriquecimento — vê motivos na lista.');
      } else {
        toast.success('Pré-visualização pronta — confirma o que gravar.');
      }
    } catch {
      toast.error('Erro de rede');
    } finally {
      setBatchLoading(false);
    }
  };

  const applyBatch = async () => {
    if (!batchRows?.length) return;
    const items = batchRows
      .filter((r) => r.canApply && selected[r.id] && r.patch)
      .map((r) => ({
        productId: r.id,
        ...r.patch,
      }));
    if (items.length === 0) {
      toast.error('Seleciona pelo menos um produto com dados propostos');
      return;
    }
    setApplyLoading(true);
    try {
      const res = await fetch('/api/admin/master/products-enrich-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ apply: true, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Falha ao gravar');
        return;
      }
      const applied = typeof data.applied === 'number' ? data.applied : 0;
      setBatchDialogOpen(false);
      setBatchRows(null);
      setSelected({});
      setBatchSummary(`${applied} produto(s) atualizados na base.`);
      toast.success(`Gravado: ${applied} produto(s)`);
    } catch {
      toast.error('Erro de rede');
    } finally {
      setApplyLoading(false);
    }
  };

  const copyJson = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      toast.success('JSON copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Buscar dados de produto</h1>
      <p className="mb-4 max-w-2xl text-sm text-gray-600">
        ML (Brasil) + Google CSE + Gemini quando configurados. Por <strong>EAN</strong>, só entram resultados em
        que o código de barras aparece no anúncio ou nos resultados Google.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'name' ? 'default' : 'outline'}
          className={mode === 'name' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          onClick={() => {
            setMode('name');
            setResult(null);
          }}
        >
          Por nome
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'ean' ? 'default' : 'outline'}
          className={mode === 'ean' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          onClick={() => {
            setMode('ean');
            setResult(null);
          }}
        >
          <Barcode className="mr-1.5 h-3.5 w-3.5" />
          Por código de barras
        </Button>
      </div>

      <div className="mb-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="busca-produto">{mode === 'ean' ? 'EAN / código de barras' : 'Nome do produto'}</Label>
          <Input
            id="busca-produto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === 'ean' ? 'Ex.: 7891234567890' : 'Ex.: cimento CP-II 50kg'}
            onKeyDown={(e) => e.key === 'Enter' && void buscar()}
          />
          {mode === 'ean' ? (
            <div className="space-y-1">
              <Label htmlFor="ean-hint" className="text-xs text-gray-500">
                Nome no cadastro (opcional, ajuda o Gemini)
              </Label>
              <Input
                id="ean-hint"
                value={eanNameHint}
                onChange={(e) => setEanNameHint(e.target.value)}
                placeholder="Ex.: mesmo nome que no ERP"
                className="h-8 text-sm"
              />
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={() => void buscar()}
          disabled={loading}
          className="shrink-0 bg-amber-600 hover:bg-amber-700"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Pesquisar
        </Button>
      </div>

      <div className="mb-8 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-4 max-w-2xl space-y-3">
        <p className="text-sm font-medium text-gray-900">Gravar na base (lote)</p>
        <p className="text-xs text-gray-600">
          Até <strong>50</strong> produtos por corrida (máx. 55), com EAN e em falta imagem, peso ou dimensões. Por
          defeito só <strong>ativos no catálogo</strong> e <strong>ainda não analisados</strong> neste fluxo — assim o
          lote não repete APIs em produtos já pesquisados; marca abaixo se quiseres incluir esses de novo.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Catálogo</Label>
            <Select
              value={batchCatalog}
              onValueChange={(v) => setBatchCatalog(v as 'active' | 'inactive' | 'all')}
            >
              <SelectTrigger className="h-9 w-[200px] bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Só ativos (recomendado)</SelectItem>
                <SelectItem value="inactive">Só inativos</SelectItem>
                <SelectItem value="all">Ativos e inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <Checkbox
              checked={batchIncludeRechecked}
              onCheckedChange={(c) => setBatchIncludeRechecked(c === true)}
            />
            Incluir produtos já analisados neste lote (pesquisar de novo)
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={batchLoading}
          onClick={() => void runBatchPreview()}
        >
          {batchLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Correr Enriquecimento
        </Button>
        {batchSummary ? <p className="text-xs text-gray-700">{batchSummary}</p> : null}
      </div>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enriquecimento por EAN — confirmar gravação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Marca os produtos que queres atualizar na base (imagem, peso, dimensões). Podes desmarcar linhas duvidosas.
          </p>
          <div className="max-h-[55vh] overflow-auto rounded-md border border-gray-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b bg-gray-50">
                <tr>
                  <th className="w-10 px-2 py-2" />
                  <th className="px-2 py-2 font-semibold text-gray-700">Produto</th>
                  <th className="px-2 py-2 font-semibold text-gray-700">EAN</th>
                  <th className="px-2 py-2 font-semibold text-gray-700">Fonte</th>
                  <th className="px-2 py-2 font-semibold text-gray-700">Proposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(batchRows ?? []).map((r) => (
                  <tr key={r.id} className={r.canApply ? 'bg-white' : 'bg-gray-50/80'}>
                    <td className="px-2 py-2 align-top">
                      {r.canApply ? (
                        <Checkbox
                          checked={Boolean(selected[r.id])}
                          onCheckedChange={(c) =>
                            setSelected((prev) => ({ ...prev, [r.id]: c === true }))
                          }
                          aria-label={`Incluir ${r.name}`}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      {r.resolvedTitle && r.resolvedTitle !== r.name ? (
                        <div className="text-xs text-gray-500" title="Título na fonte">
                          Fonte: {r.resolvedTitle}
                        </div>
                      ) : null}
                      {!r.canApply && r.reason ? (
                        <div className="mt-1 text-xs text-amber-800">{r.reason}</div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top font-mono text-xs text-gray-700">
                      {r.matched_ean || r.codBarra || '—'}
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-gray-600">{r.source ?? '—'}</td>
                    <td className="px-2 py-2 align-top">
                      {r.patch ? (
                        <ul className="space-y-1 text-xs text-gray-700">
                          {r.patch.weight != null ? (
                            <li>
                              Peso: <strong>{r.patch.weight}</strong> kg
                            </li>
                          ) : null}
                          {r.patch.dimensionsCm ? (
                            <li>
                              Dim.: <strong>{r.patch.dimensionsCm}</strong>
                            </li>
                          ) : null}
                          {r.patch.imageUrl ? (
                            <li className="flex items-start gap-2">
                              <span className="shrink-0">Img:</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={r.patch.imageUrl}
                                alt=""
                                className="h-12 w-12 rounded border object-contain bg-white"
                              />
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
            <span className="text-sm text-gray-600">
              {selectedCount} selecionado(s) para gravar
            </span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={applyLoading || selectedCount === 0}
                onClick={() => void applyBatch()}
              >
                {applyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gravar na base
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyJson()}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar JSON
              </Button>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Nome</dt>
                <dd className="font-medium text-gray-900">{result.title}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Fonte</dt>
                <dd className="font-medium text-gray-900">{result.source}</dd>
              </div>
              {result.matched_ean ? (
                <div>
                  <dt className="text-gray-500">EAN validado</dt>
                  <dd className="font-mono text-sm text-gray-900">{result.matched_ean}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-gray-500">Peso (g)</dt>
                <dd className="font-medium text-gray-900">
                  {result.weight_grams != null ? result.weight_grams.toLocaleString('pt-BR') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Dimensões (cm)</dt>
                <dd className="font-medium text-gray-900">{result.dimensions_cm ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Preço referência (BRL)</dt>
                <dd className="font-medium text-gray-900">
                  {result.price_reference != null
                    ? result.price_reference.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : '—'}
                </dd>
              </div>
              {result.ml_url ? (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Mercado Livre</dt>
                  <dd>
                    <a
                      href={result.ml_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 underline hover:text-amber-900"
                    >
                      Abrir anúncio
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            {result.photos.length > 0 ? (
              <div className="mt-6">
                <p className="mb-2 text-sm text-gray-500">Fotos</p>
                <ul className="flex flex-wrap gap-2">
                  {result.photos.map((url) => (
                    <li key={url} className="relative h-24 w-24 overflow-hidden rounded-lg border bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-950 p-4 text-gray-100">
            <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
