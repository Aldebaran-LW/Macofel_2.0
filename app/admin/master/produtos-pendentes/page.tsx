'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type PendingRow = {
  _id: string;
  name?: string;
  codigo?: string;
  description?: string;
  subcategoria?: string;
  macroCategorySlug?: string;
};

export default function ProdutosPendentes() {
  const [products, setProducts] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const fetchPending = useCallback(async () => {
    const res = await fetch('/api/admin/catalog/pending', { credentials: 'include' });
    const data = await res.json();
    setProducts((data.products as PendingRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approve = async (id: string) => {
    const res = await fetch(`/api/admin/catalog/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Aprovado pelo administrador' }),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success('Produto aprovado!');
      fetchPending();
    } else {
      toast.error(typeof data.error === 'string' ? data.error : 'Erro ao aprovar');
    }
  };

  const reject = async (id: string) => {
    const notes = rejectNotes[id] || 'Rejeitado pelo administrador';
    const res = await fetch(`/api/admin/catalog/reject/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
      credentials: 'include',
    });

    if (res.ok) {
      toast.success('Produto rejeitado');
      fetchPending();
    } else {
      toast.error('Erro ao rejeitar');
    }
  };

  if (loading) return <div className="p-8">Carregando produtos pendentes...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produtos pendentes de revisão</h1>
        <p className="text-muted-foreground">{products.length} produtos aguardando aprovação</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Card key={p._id} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="line-clamp-2">{p.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Código: {p.codigo ?? '—'}</p>
              {(p.macroCategorySlug || p.subcategoria) && (
                <p className="text-xs text-muted-foreground">
                  Macro: {p.macroCategorySlug ?? '—'}
                  {p.subcategoria ? ` · Grupo: ${p.subcategoria}` : ''}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  DESCRIÇÃO GERADA PELA IA
                </p>
                <p className="line-clamp-4 border-l-2 border-primary pl-3 text-sm">
                  {p.description ?? ''}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => approve(p._id)} className="flex-1">
                  Aprovar
                </Button>

                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Motivo da rejeição (opcional)"
                    value={rejectNotes[p._id] || ''}
                    onChange={(e) =>
                      setRejectNotes({ ...rejectNotes, [p._id]: e.target.value })
                    }
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => reject(p._id)}
                    variant="destructive"
                    className="w-full"
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
