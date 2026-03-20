'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Item = {
  productId: string;
  name: string;
  slug?: string;
  quantity: number;
  price?: number;
};

type Solicitacao = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  message: string | null;
  items: Item[];
  status: string;
  createdAt: string | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  viewed: 'Visualizado',
  answered: 'Respondido',
  archived: 'Arquivado',
};

export default function AdminSolicitacoesOrcamentoPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Solicitacao[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', '20');
    if (statusFilter !== 'all') p.set('status', statusFilter);
    return p.toString();
  }, [page, statusFilter]);

  useEffect(() => {
    let c = false;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch(`/api/quote-requests?${query}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? 'Erro ao carregar');
        }
        const data = await res.json();
        if (c) return;
        setList(data?.solicitacoes ?? []);
        setTotalPages(data?.pagination?.totalPages ?? 1);
      } catch (e: any) {
        toast.error(e?.message ?? 'Erro');
      } finally {
        if (!c) setLoading(false);
      }
    }
    void run();
    return () => {
      c = true;
    };
  }, [query]);

  const setStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/quote-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? 'Erro ao atualizar');
      }
      toast.success('Status atualizado');
      setList((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-red-600" />
          Solicitações de orçamento
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="viewed">Visualizado</option>
            <option value="answered">Respondido</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((s) => (
            <div key={s.id} className="bg-white rounded-lg shadow p-5 border border-gray-100">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-gray-900">{s.userName}</p>
                  <p className="text-sm text-gray-600">{s.userEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      s.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : s.status === 'answered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabels[s.status] ?? s.status}
                  </span>
                  <select
                    className="border rounded-md px-2 py-1.5 text-sm min-w-[160px]"
                    value={s.status}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v !== s.status) void setStatus(s.id, v);
                    }}
                  >
                    {(['pending', 'viewed', 'answered', 'archived'] as const).map((st) => (
                      <option key={st} value={st}>
                        {statusLabels[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {s.message && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mb-3">{s.message}</p>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Produto</th>
                      <th className="py-2 pr-4">Qtd</th>
                      <th className="py-2">Ref. preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((it, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-4">{it.name}</td>
                        <td className="py-2 pr-4">{it.quantity}</td>
                        <td className="py-2">
                          {it.price != null ? `R$ ${Number(it.price).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
