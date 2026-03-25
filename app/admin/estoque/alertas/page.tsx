'use client';

import { useEffect, useState } from 'react';
import StockSubnav from '@/components/stock-subnav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type AlertProduct = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  category?: { id: string; name: string } | null;
};

export default function AdminEstoqueAlertasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AlertProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/stock/alerts');
        if (!res.ok) throw new Error('Falha ao carregar alertas');
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setItems(list);
      } catch (e: any) {
        if (!cancelled) setItems([]);
        toast.error(e?.message || 'Erro ao carregar alertas de estoque');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de estoque</h1>
        <p className="text-gray-600 mt-1">Produtos com estoque baixo ou zerado (baseado no estoque mínimo).</p>
      </div>

      <StockSubnav />

      <Card className="p-4">
        {loading ? (
          <div className="py-10 text-center text-gray-600">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-600">Nenhum alerta no momento.</div>
        ) : (
          <div className="divide-y">
            {items.map((p) => {
              const status = p.stock === 0 ? 'zerado' : p.stock <= p.minStock ? 'baixo' : 'ok';
              return (
                <div key={p.id} className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                      {p.category?.name ? <Badge variant="secondary">{p.category.name}</Badge> : null}
                      {status === 'zerado' ? (
                        <Badge className="bg-red-600 hover:bg-red-600">Zerado</Badge>
                      ) : status === 'baixo' ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600">Baixo</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Estoque: <span className="font-semibold text-gray-900">{p.stock}</span> · Mínimo:{' '}
                      <span className="font-semibold text-gray-900">{p.minStock}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

