'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import StockSubnav from '@/components/stock-subnav';

type PendingProduct = {
  _id: string;
  name?: string;
  codigo?: string;
  description?: string;
  price?: number;
  pricePrazo?: number;
  marca?: string;
  subcategoria?: string;
  macroCategorySlug?: string;
  created_at?: string;
  status?: string | boolean;
  enrichmentStatus?: 'pending' | 'running' | 'done' | 'failed';
};

function formatBrl(n: number | undefined) {
  if (n === undefined || !Number.isFinite(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProdutosPendentesPage() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState<'mark' | 'enrich' | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/catalog/pending', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao carregar pendentes');
        setProducts([]);
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      toast.error('Erro ao carregar pendentes');
      setProducts([]);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPending();
    const interval = setInterval(() => {
      void fetchPending();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const approve = async (id: string) => {
    setApproving(id);
    try {
      const res = await fetch(`/api/admin/catalog/approve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Aprovado pelo Master Admin' }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Produto aprovado e ativado!');
        void fetchPending();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao aprovar');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setApproving(null);
    }
  };

  const reject = async (id: string) => {
    const notes = rejectNotes[id]?.trim() || 'Rejeitado pelo administrador';
    try {
      const res = await fetch(`/api/admin/catalog/reject/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Produto rejeitado');
        void fetchPending();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao rejeitar');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const markActiveShortDescriptions = async () => {
    setQueueBusy('mark');
    try {
      const res = await fetch('/api/admin/catalog/mark-active-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'short_description', maxToMark: 300 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(typeof data.message === 'string' ? data.message : 'Fila atualizada');
        void fetchPending();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao marcar fila');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setQueueBusy(null);
    }
  };

  const runActiveEnrichBatch = async () => {
    setQueueBusy('enrich');
    try {
      const res = await fetch('/api/admin/catalog/enrich-active-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(typeof data.message === 'string' ? data.message : 'Lote processado');
        void fetchPending();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro no lote IA');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setQueueBusy(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <StockSubnav />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StockSubnav />

      <div className="mx-auto max-w-7xl px-0 sm:px-1">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Produtos Pendentes (IA)</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-2">
              <RefreshCw className="h-4 w-4 shrink-0" />
              Atualizando automaticamente a cada 4 segundos • Enriquecimento em background
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-4 py-2 text-lg">
            {products.length} produtos
          </Badge>
        </div>

        <Card className="border-dashed bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fila global — ativos no catálogo</CardTitle>
            <p className="text-sm text-muted-foreground">
              1) Marca produtos <strong>ativos</strong> com descrição curta (&lt; 160 caracteres) como{' '}
              <code className="text-xs">pending</code>. 2) Processa um lote com Gemini (tamanho máx.{' '}
              <code className="text-xs">MAX_CATALOG_BATCH</code>). Na Vercel, um cron diário (06:00 UTC)
              chama o mesmo endpoint se definires <code className="text-xs">CRON_SECRET</code> no projeto.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={queueBusy !== null}
              onClick={() => void markActiveShortDescriptions()}
            >
              {queueBusy === 'mark' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Marcar ativos (descrição curta)
            </Button>
            <Button
              type="button"
              disabled={queueBusy !== null}
              onClick={() => void runActiveEnrichBatch()}
            >
              {queueBusy === 'enrich' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Processar lote IA (fila pending)
            </Button>
          </CardContent>
        </Card>

        {products.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum produto pendente no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => {
              const priceLabel = formatBrl(p.price);
              const prazoLabel = formatBrl(p.pricePrazo);
              const canApprove = p.status === 'pending_review';
              const enrich = p.enrichmentStatus;
              const isLiveActive = p.status === true;
              const enriching =
                enrich === 'running' ||
                (enrich === 'pending' &&
                  (p.status === 'imported' || isLiveActive));

              return (
                <Card key={p._id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2">{p.name ?? 'Sem nome'}</CardTitle>
                      <div className="flex shrink-0 items-center gap-1">
                        {enrich === 'done' || (canApprove && !enrich) ? (
                          <CheckCircle className="h-5 w-5 text-green-500" aria-hidden />
                        ) : null}
                        {enrich === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-500" aria-hidden />
                        ) : null}
                        {enriching ? (
                          <Loader2 className="h-5 w-5 animate-spin text-amber-600" aria-hidden />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">{p.codigo?.trim() ? p.codigo : '—'}</Badge>
                      {p.marca ? <Badge variant="outline">{p.marca}</Badge> : null}
                      {enrich ? (
                        <Badge variant="outline" className="font-normal">
                          IA: {enrich}
                        </Badge>
                      ) : null}
                    </div>
                    {(p.macroCategorySlug || p.subcategoria) && (
                      <p className="text-xs text-muted-foreground">
                        {p.macroCategorySlug ? `Macro: ${p.macroCategorySlug}` : null}
                        {p.macroCategorySlug && p.subcategoria ? ' · ' : null}
                        {p.subcategoria ? `Grupo: ${p.subcategoria}` : null}
                      </p>
                    )}
                    {(priceLabel || prazoLabel) && (
                      <p className="text-sm font-medium text-foreground">
                        {priceLabel ? <span>À vista: {priceLabel}</span> : null}
                        {priceLabel && prazoLabel ? ' · ' : null}
                        {prazoLabel ? <span>Prazo: {prazoLabel}</span> : null}
                      </p>
                    )}
                    {p.created_at ? (
                      <p className="text-xs text-muted-foreground">
                        Recebido:{' '}
                        {new Date(p.created_at).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        DESCRIÇÃO {enriching ? '(aguardando IA…)' : '(IA / relatório)'}
                      </p>
                      <p className="line-clamp-5 border-l-2 border-primary pl-3 text-sm">
                        {p.description?.trim() ? p.description : '—'}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={() => void approve(p._id)}
                        disabled={!canApprove || approving === p._id}
                        className="flex-1"
                        title={
                          !canApprove
                            ? 'Aguarde o enriquecimento IA terminar (status pending_review)'
                            : undefined
                        }
                      >
                        {approving === p._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprovar
                          </>
                        )}
                      </Button>

                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Motivo da rejeição (opcional)"
                          value={rejectNotes[p._id] || ''}
                          onChange={(e) =>
                            setRejectNotes({ ...rejectNotes, [p._id]: e.target.value })
                          }
                          className="h-20 text-xs"
                        />
                        <Button
                          type="button"
                          onClick={() => void reject(p._id)}
                          variant="destructive"
                          className="w-full"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
