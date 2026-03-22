'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AuditRow = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

function formatMeta(meta: unknown): string {
  if (meta == null) return '—';
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

export default function MasterAuditoriaPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/audit?limit=100', { cache: 'no-store' });
      if (!res.ok) {
        toast.error('Não foi possível carregar a auditoria');
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      toast.error('Erro ao carregar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScrollText className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Auditoria</h1>
            <p className="text-sm text-gray-600">
              Últimos eventos registados (ex.: alteração de roles, atualização de configurações).
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Sem registos ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-3 py-3 font-semibold text-gray-700">Quando</th>
                  <th className="px-3 py-3 font-semibold text-gray-700">Ação</th>
                  <th className="px-3 py-3 font-semibold text-gray-700">Autor</th>
                  <th className="px-3 py-3 font-semibold text-gray-700">Alvo</th>
                  <th className="px-3 py-3 font-semibold text-gray-700">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {new Date(row.createdAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.action}</td>
                    <td className="max-w-[180px] break-all px-3 py-2 text-gray-700">
                      {row.actorEmail ?? row.actorId ?? '—'}
                    </td>
                    <td className="max-w-[160px] break-all px-3 py-2 text-gray-600">
                      {row.targetType && row.targetId
                        ? `${row.targetType}:${row.targetId}`
                        : row.targetId ?? row.targetType ?? '—'}
                    </td>
                    <td className="max-w-md px-3 py-2 font-mono text-xs text-gray-700">
                      {formatMeta(row.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
