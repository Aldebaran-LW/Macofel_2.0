'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type AuditSource = 'site' | 'pdv' | 'telegram';

type AuditRow = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  source: AuditSource;
  createdAt: string;
};

type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

const ACTOR_EMAIL_ANY = '__any__';

const SOURCE_LABEL: Record<AuditSource | 'all', string> = {
  all: 'Todos',
  site: 'Site (painel)',
  pdv: 'PDV',
  telegram: 'Telegram',
};

function formatMeta(meta: unknown): string {
  if (meta == null) return '—';
  try {
    return JSON.stringify(meta, null, 0);
  } catch {
    return String(meta);
  }
}

function sourceBadgeClass(s: AuditSource) {
  if (s === 'pdv') return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  if (s === 'telegram') return 'bg-sky-100 text-sky-900 border-sky-200';
  return 'bg-indigo-100 text-indigo-900 border-indigo-200';
}

export default function MasterAuditoriaPage() {
  const [source, setSource] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');

  const [items, setItems] = useState<AuditRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStaffLoading(true);
      try {
        const res = await fetch('/api/admin/master/users', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) toast.error('Não foi possível carregar a lista de funcionários');
          return;
        }
        const data = (await res.json()) as StaffUser[];
        if (!cancelled && Array.isArray(data)) {
          const sorted = [...data].sort((a, b) =>
            a.email.localeCompare(b.email, 'pt', { sensitivity: 'base' })
          );
          setStaff(sorted);
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar funcionários');
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applied = useMemo(
    () => ({ source, from, to, actorEmail, action, q }),
    [source, from, to, actorEmail, action, q]
  );

  const buildParams = useCallback(
    (cursor: string | null) => {
      const p = new URLSearchParams();
      p.set('limit', '50');
      if (applied.source && applied.source !== 'all') p.set('source', applied.source);
      if (applied.from.trim()) p.set('from', applied.from.trim());
      if (applied.to.trim()) p.set('to', applied.to.trim());
      if (applied.actorEmail.trim()) p.set('actorEmail', applied.actorEmail.trim());
      if (applied.action.trim()) p.set('action', applied.action.trim());
      if (applied.q.trim()) p.set('q', applied.q.trim());
      if (cursor) p.set('cursor', cursor);
      return p;
    },
    [applied]
  );

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const params = buildParams(cursor);
      const res = await fetch(`/api/admin/master/audit?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        toast.error('Não foi possível carregar a auditoria');
        if (!append) setItems([]);
        return null;
      }
      const data = (await res.json()) as {
        items?: AuditRow[];
        nextCursor?: string | null;
      };
      const rows = Array.isArray(data.items) ? data.items : [];
      const next = data.nextCursor ?? null;
      if (append) {
        setItems((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const merged = [...prev];
          for (const r of rows) {
            if (!seen.has(r.id)) {
              seen.add(r.id);
              merged.push(r);
            }
          }
          return merged;
        });
      } else {
        setItems(rows);
      }
      setNextCursor(next);
      return rows;
    },
    [buildParams]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPage(null, false);
    } catch {
      toast.error('Erro ao carregar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPage(null, false);
    } catch {
      toast.error('Erro ao carregar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(nextCursor, true);
    } catch {
      toast.error('Erro ao carregar mais');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, nextCursor, loadingMore]);

  useEffect(() => {
    void applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem (filtros iniciais)
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScrollText className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Auditoria</h1>
            <p className="text-sm text-gray-600">
              Ações da equipa no <strong>site</strong>, no <strong>PDV</strong> e no <strong>Telegram</strong>{' '}
              (vendas, stock, produtos, pedidos de orçamento, configurações sensíveis, etc.).
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <Label htmlFor="audit-source">Origem</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="audit-source">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{SOURCE_LABEL.all}</SelectItem>
                <SelectItem value="site">{SOURCE_LABEL.site}</SelectItem>
                <SelectItem value="pdv">{SOURCE_LABEL.pdv}</SelectItem>
                <SelectItem value="telegram">{SOURCE_LABEL.telegram}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] space-y-1.5">
            <Label htmlFor="audit-from">Desde</Label>
            <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="min-w-[120px] space-y-1.5">
            <Label htmlFor="audit-to">Até</Label>
            <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="min-w-[180px] flex-[2] space-y-1.5">
            <Label htmlFor="audit-q">Busca geral</Label>
            <Input
              id="audit-q"
              placeholder="Ação, e-mail, ID, tipo de alvo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyFilters();
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-[1.2] space-y-1.5">
            <Label htmlFor="audit-actor">E-mail do autor</Label>
            <Select
              value={actorEmail ? actorEmail : ACTOR_EMAIL_ANY}
              onValueChange={(v) => setActorEmail(v === ACTOR_EMAIL_ANY ? '' : v)}
              disabled={staffLoading}
            >
              <SelectTrigger id="audit-actor" className="w-full">
                <SelectValue placeholder={staffLoading ? 'A carregar…' : 'Escolher funcionário'} />
              </SelectTrigger>
              <SelectContent className="max-h-[min(320px,70vh)]">
                <SelectItem value={ACTOR_EMAIL_ANY}>Qualquer e-mail</SelectItem>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    <span className="truncate">
                      {`${u.firstName} ${u.lastName}`.trim() || u.email} ({u.email})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="audit-action">Ação (contém)</Label>
            <Input
              id="audit-action"
              placeholder="ex.: product, pdv, telegram"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => void applyFilters()} disabled={loading} className="shrink-0">
            <Search className="mr-2 h-4 w-4" />
            Aplicar filtros
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Nenhum registo com estes filtros.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-gray-700">Quando</th>
                    <th className="px-3 py-3 font-semibold text-gray-700">Origem</th>
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
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded-md border px-2 py-0.5 text-xs font-medium',
                            sourceBadgeClass(row.source ?? 'site')
                          )}
                        >
                          {SOURCE_LABEL[(row.source ?? 'site') as AuditSource]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.action}</td>
                      <td className="max-w-[200px] break-all px-3 py-2 text-gray-700">
                        {row.actorEmail ?? row.actorId ?? '—'}
                      </td>
                      <td className="max-w-[180px] break-all px-3 py-2 text-gray-600">
                        {row.targetType && row.targetId
                          ? `${row.targetType}:${row.targetId}`
                          : row.targetId ?? row.targetType ?? '—'}
                      </td>
                      <td className="max-w-md px-3 py-2 font-mono text-xs text-gray-700">
                        <span className="line-clamp-4 whitespace-pre-wrap break-all">{formatMeta(row.metadata)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextCursor ? (
              <div className="border-t border-gray-100 p-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  <ChevronDown className={cn('mr-2 h-4 w-4', loadingMore && 'animate-pulse')} />
                  Carregar mais
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
