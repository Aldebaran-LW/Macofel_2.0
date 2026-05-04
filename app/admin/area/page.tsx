'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, UserCog, Shield, Search, ArrowRight, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGerenteSiteRole } from '@/lib/permissions';

type QuickAction = {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  requiresMaster?: boolean;
};

export default function AdminAreaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [q, setQ] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (role && isGerenteSiteRole(role)) {
      router.replace('/admin/dashboard');
    }
  }, [role, status, router]);

  const actions = useMemo<QuickAction[]>(
    () => [
      {
        id: 'stock-alerts',
        label: 'Estoque — Alertas',
        desc: 'Produtos com estoque baixo/zerado (por estoque mínimo).',
        href: '/admin/estoque/alertas',
        icon: Boxes,
        hotkey: '1',
      },
      {
        id: 'stock-movements',
        label: 'Estoque — Movimentações',
        desc: 'Entradas/saídas e histórico por produto.',
        href: '/admin/estoque/movimentacoes',
        icon: Boxes,
        hotkey: '2',
      },
      {
        id: 'stock-import',
        label: 'Estoque — Importação',
        desc: 'Importar CSV/XLSX/XML/PDF e aplicar em lote.',
        href: '/admin/estoque/importacao',
        icon: Boxes,
        hotkey: '3',
      },
      {
        id: 'stock-report',
        label: 'Estoque — Relatórios',
        desc: 'Visões consolidadas e exportáveis do estoque.',
        href: '/admin/estoque/relatorios',
        icon: Boxes,
        hotkey: '4',
      },
      {
        id: 'team',
        label: 'Equipe & roles',
        desc: 'Gestão de equipe interna.',
        href: '/admin/equipe',
        icon: UserCog,
        hotkey: 'E',
      },
      {
        id: 'team-passwords',
        label: 'Equipe — Senhas',
        desc: 'Redefinição/gestão de senhas da equipe interna.',
        href: '/admin/senhas',
        icon: KeyRound,
        hotkey: 'S',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = actions;
    if (!term) return base;
    return base.filter((a) => {
      const hay = `${a.label} ${a.desc}`.toLowerCase();
      return hay.includes(term);
    });
  }, [actions, q]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const byHotkey = actions.find((a) => {
        return a.hotkey?.toLowerCase() === key.toLowerCase();
      });
      if (byHotkey) {
        e.preventDefault();
        router.push(byHotkey.href);
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, router]);

  if (status !== 'loading' && role && isGerenteSiteRole(role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        A redirecionar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 rounded-xl border border-emerald-400/50 bg-slate-950 p-4 text-white shadow-lg ring-1 ring-emerald-400/20">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-emerald-400 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-950">
            Admin • Área
          </span>
          <p className="text-sm text-white/80">Menu rápido (economia de tempo).</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Estoque e equipe</h1>
            <p className="mt-1 text-sm text-white/80">
              Digite para filtrar. Atalhos:{' '}
              <span className="font-extrabold text-white">1–4</span> (Estoque)
              {' '}• <span className="font-extrabold text-white">E</span> (Equipe)
              {' '}• <span className="font-extrabold text-white">S</span> (Senhas)
            </p>

            <nav className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/estoque/alertas"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <Boxes className="h-4 w-4 shrink-0" />
                Estoque
              </Link>

              <Link
                href="/admin/equipe"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-300/15 px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-emerald-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <UserCog className="h-4 w-4 shrink-0" />
                Gerenciar equipe
              </Link>

              <Link
                href="/admin/senhas"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-300/15 px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-emerald-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <KeyRound className="h-4 w-4 shrink-0" />
                Senhas
              </Link>
            </nav>
          </div>

          <div className="w-full sm:max-w-md">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300/60 bg-slate-900 px-3 py-2 shadow-inner">
              <Search className="h-4 w-4 text-emerald-200" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtrar ações (ex.: importação, alertas, equipe)"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/70 outline-none"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-extrabold text-slate-950 hover:bg-emerald-200"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Ações</h2>
          <p className="mt-0.5 text-xs text-gray-600">
            Clique para abrir. Use os atalhos para entrar direto sem navegar pelo menu.
          </p>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">Nenhuma ação encontrada.</div>
          ) : (
            filtered.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.id}
                  href={a.href}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-emerald-50/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-gray-900">{a.label}</span>
                        {a.hotkey ? (
                          <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                            {a.hotkey}
                          </kbd>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-gray-600">{a.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

