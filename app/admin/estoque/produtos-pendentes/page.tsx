'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import StockSubnav from '@/components/stock-subnav';

interface PendingProduct {
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
}

function formatBrl(n: number | undefined) {
  if (n === undefined || !Number.isFinite(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProdutosPendentesPage() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/catalog/pending', {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao carregar produtos pendentes');
        setProducts([]);
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      toast.error('Erro ao carregar produtos pendentes');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPending();
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

  if (loading) {
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
            <h1 className="text-3xl font-bold">Produtos Pendentes de Revisão</h1>
            <p className="text-muted-foreground">
              Enriquecidos pelo agente IA • Aguarda aprovação humana
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-4 py-2 text-lg">
            {products.length} produtos
          </Badge>
        </div>

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
              return (
                <Card key={p._id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{p.name ?? 'Sem nome'}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">{p.codigo?.trim() ? p.codigo : '—'}</Badge>
                      {p.marca ? <Badge variant="outline">{p.marca}</Badge> : null}
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
                        DESCRIÇÃO GERADA PELA IA
                      </p>
                      <p className="line-clamp-5 border-l-2 border-primary pl-3 text-sm">
                        {p.description?.trim() ? p.description : '—'}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={() => void approve(p._id)}
                        disabled={approving === p._id}
                        className="flex-1"
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
