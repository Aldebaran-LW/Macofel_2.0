'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Row = {
  pdvVendaId: string;
  numero: number | null;
  dataHora: string | null;
  total: number;
  formaPagamento: string;
  operador: string | null;
  terminal: number | null;
  status: string;
  itemCount: number;
  receivedAt: string | null;
  voidedAt: string | null;
};

export function HistoricoCaixaClient() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [items, setItems] = useState<Row[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/painel-loja/pdv-vendas?limit=50', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Falha ao carregar');
        }
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setWarning(typeof data.warning === 'string' ? data.warning : null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : 'Erro');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/painel-loja"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-slate-900">Histórico do caixa (sincronizado)</h1>
      <p className="mb-6 text-sm text-slate-600">
        Vendas enviadas pelo PDV para o site (coleção <code className="rounded bg-slate-100 px-1">pdv_sales</code>
        ).{' '}
        {role === 'SELLER'
          ? 'Mostram-se apenas vendas cujo campo operador coincide com o seu User Name PDV.'
          : 'Como gerente, vê as vendas recentes de todos os operadores.'}
      </p>

      {warning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {warning}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-500">A carregar…</div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Nenhuma venda encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Data (PDV)</th>
                <th className="px-4 py-3">Recebido</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => (
                <tr key={row.pdvVendaId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-800">{fmtDate(row.dataHora)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(row.receivedAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.operador ?? '—'}</td>
                  <td className="px-4 py-3">{row.itemCount}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fmtMoney(row.total)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.formaPagamento || '—'}</td>
                  <td className="px-4 py-3">
                    {row.status === 'cancelada' || row.voidedAt ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Cancelada
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                        Registada
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
