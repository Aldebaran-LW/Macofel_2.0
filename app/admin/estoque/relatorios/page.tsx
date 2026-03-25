'use client';

import { useEffect, useState } from 'react';
import StockSubnav from '@/components/stock-subnav';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type StockReport = {
  totals: {
    products: number;
    totalUnits: number;
    totalStockValue: number;
    lowOrZero: number;
  };
  recentMovements: Array<{
    id: string;
    productName: string;
    type: 'entrada' | 'saida';
    quantity: number;
    createdAt: string;
  }>;
};

export default function AdminEstoqueRelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StockReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/stock/report');
        if (!res.ok) throw new Error('Falha ao carregar relatório');
        const json = (await res.json()) as StockReport;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setData(null);
        toast.error(e?.message || 'Erro ao carregar relatório');
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
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-gray-600 mt-1">Resumo do estoque e movimentações recentes.</p>
      </div>

      <StockSubnav />

      {loading ? (
        <div className="py-10 text-center text-gray-600">Carregando...</div>
      ) : !data ? (
        <div className="py-10 text-center text-gray-600">Sem dados.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Produtos</div>
            <div className="text-2xl font-bold">{data.totals.products}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Unidades em estoque</div>
            <div className="text-2xl font-bold">{data.totals.totalUnits}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Valor estimado (R$)</div>
            <div className="text-2xl font-bold">{data.totals.totalStockValue.toFixed(2)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Baixo/Zerado</div>
            <div className="text-2xl font-bold">{data.totals.lowOrZero}</div>
          </Card>

          <Card className="p-4 lg:col-span-4">
            <div className="font-semibold">Movimentações recentes</div>
            {data.recentMovements.length === 0 ? (
              <div className="py-8 text-center text-gray-600">Sem movimentações.</div>
            ) : (
              <div className="mt-3 divide-y">
                {data.recentMovements.map((m) => (
                  <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{m.productName}</div>
                      <div className="text-sm text-gray-600">
                        {m.type === 'entrada' ? 'Entrada' : 'Saída'} · <span className="font-semibold">{m.quantity}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 shrink-0">{new Date(m.createdAt).toLocaleString('pt-BR')}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

