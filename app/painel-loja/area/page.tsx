'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  ClipboardList,
  Cpu,
  Download,
  FileText,
  FolderOpen,
  History,
  Lock,
  Monitor,
  Search,
  FileWarning,
  Bot,
} from 'lucide-react';
import {
  canUseStaffTelegramBot,
  hasPermission,
  isPainelLojaGerenteScopeRole,
} from '@/lib/permissions';
import type { AppPermission } from '@/lib/permissions';

type QuickAction = {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  permission?: AppPermission;
};

export default function PainelLojaGerenteAreaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [q, setQ] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || !isPainelLojaGerenteScopeRole(role)) {
      router.replace('/painel-loja');
    }
  }, [session, status, role, router]);

  const actions = useMemo<QuickAction[]>(() => {
    const list: QuickAction[] = [
      {
        id: 'pdv-web',
        label: 'PDV no navegador',
        desc: 'Caixa em ecrã completo (/loja).',
        href: '/loja',
        icon: Monitor,
        hotkey: 'P',
      },
      {
        id: 'hist-caixa',
        label: 'Histórico do caixa',
        desc: 'Vendas e movimentos por operador.',
        href: '/painel-loja/historico-caixa',
        icon: History,
        hotkey: 'H',
      },
      {
        id: 'orc-montar',
        label: 'Montar orçamento',
        desc: 'Orçamento interno (PDV).',
        href: '/painel-loja/orcamento',
        icon: FileText,
        hotkey: 'M',
      },
      {
        id: 'orc-salvos',
        label: 'Orçamentos salvos',
        desc: 'Lista e detalhe dos orçamentos Mongo.',
        href: '/painel-loja/orcamentos',
        icon: FolderOpen,
        hotkey: 'O',
      },
      {
        id: 'quotes-site',
        label: 'Solicitações dos clientes (site)',
        desc: 'Fila de pedidos de orçamento enviados pelo site.',
        href: '/painel-loja/solicitacoes-orcamento',
        icon: ClipboardList,
        hotkey: 'Q',
        permission: 'site:client_quote_requests',
      },
      {
        id: 'stock-alerts',
        label: 'Estoque — Alertas',
        desc: 'Stock baixo/zerado (mínimos).',
        href: '/painel-loja/estoque/alertas',
        icon: Boxes,
        hotkey: '1',
        permission: 'store:physical_stock',
      },
      {
        id: 'stock-movements',
        label: 'Estoque — Movimentações',
        desc: 'Entradas/saídas e histórico por produto.',
        href: '/painel-loja/estoque/movimentacoes',
        icon: Boxes,
        hotkey: '2',
        permission: 'store:physical_stock',
      },
      {
        id: 'stock-import',
        label: 'Estoque — Importação',
        desc: 'Importar ficheiros em lote.',
        href: '/painel-loja/estoque/importacao',
        icon: Boxes,
        hotkey: '3',
        permission: 'store:physical_stock',
      },
      {
        id: 'stock-report',
        label: 'Estoque — Relatórios',
        desc: 'Visões consolidadas do stock.',
        href: '/painel-loja/estoque/relatorios',
        icon: Boxes,
        hotkey: '4',
        permission: 'store:physical_stock',
      },
      {
        id: 'trocas',
        label: 'Trocas e devoluções',
        desc: 'Fluxo de devoluções (em evolução).',
        href: '/painel-loja/trocas-devolucoes',
        icon: ArrowLeftRight,
        hotkey: 'T',
        permission: 'store:approve_returns',
      },
      {
        id: 'caixas',
        label: 'Caixas PDV',
        desc: 'Configuração de terminais de caixa.',
        href: '/painel-loja/caixas-pdv',
        icon: Cpu,
        hotkey: 'C',
        permission: 'store:pdv_cash_register_config',
      },
      {
        id: 'registos',
        label: 'Bloquear / desbloquear registos',
        desc: 'Controlo de registos de venda.',
        href: '/painel-loja/registos-caixa',
        icon: Lock,
        hotkey: 'B',
        permission: 'store:lock_unlock_registers',
      },
      {
        id: 'rel-loja',
        label: 'Relatórios da loja',
        desc: 'Indicadores e relatórios de loja.',
        href: '/painel-loja/relatorios-loja',
        icon: FileWarning,
        hotkey: 'R',
        permission: 'store:store_reports',
      },
      {
        id: 'installer',
        label: 'PDV Desktop (Windows)',
        desc: 'Instalador para o PC do caixa.',
        href: '/painel-loja/instalador',
        icon: Download,
        hotkey: 'D',
      },
    ];

    if (canUseStaffTelegramBot(role)) {
      list.push({
        id: 'telegram',
        label: 'Telegram — código de vínculo',
        desc: 'Associar o bot ao seu utilizador.',
        href: '/equipa/telegram',
        icon: Bot,
        hotkey: 'G',
      });
    }

    return list;
  }, [role]);

  const visible = useMemo(
    () => actions.filter((a) => !a.permission || hasPermission(role, a.permission)),
    [actions, role]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return visible;
    return visible.filter((a) => {
      const hay = `${a.label} ${a.desc}`.toLowerCase();
      return hay.includes(term);
    });
  }, [visible, q]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const byHotkey = visible.find((a) => a.hotkey?.toLowerCase() === key.toLowerCase());
      if (byHotkey) {
        e.preventDefault();
        router.push(byHotkey.href);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, router]);

  if (status === 'loading' || !isPainelLojaGerenteScopeRole(role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        A carregar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 rounded-xl border border-violet-400/50 bg-slate-950 p-4 text-white shadow-lg ring-1 ring-violet-400/20">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-violet-400 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-950">
            Gerente site • Área
          </span>
          <p className="text-sm text-white/80">Atalhos às mesmas funções de gerente de loja + canal site.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Operações e gestão</h1>
            <p className="mt-1 text-sm text-white/80">
              Filtre abaixo. Atalhos: <span className="font-extrabold text-white">1–4</span> (Estoque),{' '}
              <span className="font-extrabold text-white">Q</span> (Solicitações site),{' '}
              <span className="font-extrabold text-white">P H M O</span> (PDV, histórico, orçamentos) e mais nas
              linhas.
            </p>

            <nav className="mt-3 flex flex-wrap gap-2">
              {hasPermission(role, 'site:client_quote_requests') ? (
                <Link
                  href="/painel-loja/solicitacoes-orcamento"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-400 px-3 py-2 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Solicitações (site)
                </Link>
              ) : null}
              {hasPermission(role, 'store:physical_stock') ? (
                <Link
                  href="/painel-loja/estoque/alertas"
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-300/15 px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-violet-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                >
                  <Boxes className="h-4 w-4 shrink-0" />
                  Estoque
                </Link>
              ) : null}
              <Link
                href="/loja"
                className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-300/15 px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-violet-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <Monitor className="h-4 w-4 shrink-0" />
                PDV
              </Link>
            </nav>
          </div>

          <div className="w-full sm:max-w-md">
            <div className="flex items-center gap-2 rounded-lg border border-violet-300/60 bg-slate-900 px-3 py-2 shadow-inner">
              <Search className="h-4 w-4 text-violet-200" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtrar (ex.: importação, solicitações, caixa)"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/70 outline-none"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="rounded-md bg-violet-300 px-2 py-1 text-xs font-extrabold text-slate-950 hover:bg-violet-200"
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
            Só aparecem entradas permitidas ao seu papel. Teclas de atalho quando listadas à direita.
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
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-violet-50/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-900">
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
                  <ArrowRight className="h-4 w-4 shrink-0 text-violet-700 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
