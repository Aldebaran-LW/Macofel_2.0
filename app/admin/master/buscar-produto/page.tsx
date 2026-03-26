'use client';

import { useState } from 'react';
import { Search, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BuscarProdutoResponse } from '@/lib/buscar-produto-types';

export default function MasterBuscarProdutoPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BuscarProdutoResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const buscar = async () => {
    const term = q.trim();
    if (!term) {
      toast.error('Indique o nome do produto');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/buscar-produto?q=${encodeURIComponent(term)}`, {
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
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Pesquisa automática no Mercado Livre (Brasil), com complemento via Google Custom Search e Gemini
        quando faltam fotos, peso ou dimensões. Requer variáveis{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">GOOGLE_API_KEY</code>,{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">GOOGLE_CSE_ID</code> e{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">GEMINI_API_KEY</code> no ambiente do servidor.
      </p>

      <div className="mb-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="busca-produto">Nome do produto</Label>
          <Input
            id="busca-produto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: cimento CP-II 50kg"
            onKeyDown={(e) => e.key === 'Enter' && void buscar()}
          />
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
