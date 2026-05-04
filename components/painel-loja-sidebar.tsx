'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Monitor,
  Download,
  Package,
  ArrowLeftRight,
  Home,
  LogOut,
  FileWarning,
  Cpu,
  Lock,
  History,
  FileText,
  FolderOpen,
  ClipboardList,
  Bot,
  Globe2,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  canOpenPainelLoja,
  canUseStaffTelegramBot,
  hasPermission,
  isGerenteSiteRole,
  isPainelLojaGerenteScopeRole,
} from '@/lib/permissions';

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Se definido, só aparece com esta permissão (gerente). */
  permission?: Parameters<typeof hasPermission>[1];
};

const baseItemsAll: Item[] = [
  { href: '/painel-loja', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/loja', label: 'PDV no navegador', icon: Monitor },
  { href: '/painel-loja/historico-caixa', label: 'Histórico do caixa', icon: History },
  { href: '/painel-loja/instalador', label: 'PDV Desktop (Windows)', icon: Download },
  { href: '/equipa/telegram', label: 'Código Telegram (bot)', icon: Bot },
];

const orcamentoItems: Item[] = [
  { href: '/painel-loja/orcamento', label: 'Montar orçamento', icon: FileText },
  { href: '/painel-loja/orcamentos', label: 'Orçamentos salvos', icon: FolderOpen },
  {
    href: '/painel-loja/solicitacoes-orcamento',
    label: 'Solicitações de clientes',
    icon: ClipboardList,
    permission: 'site:client_quote_requests',
  },
];

const gerenteItems: Item[] = [
  {
    href: '/painel-loja/estoque/alertas',
    label: 'Estoque físico',
    icon: Package,
    permission: 'store:physical_stock',
  },
  {
    href: '/painel-loja/trocas-devolucoes',
    label: 'Trocas e devoluções',
    icon: ArrowLeftRight,
    permission: 'store:approve_returns',
  },
  {
    href: '/painel-loja/caixas-pdv',
    label: 'Caixas PDV',
    icon: Cpu,
    permission: 'store:pdv_cash_register_config',
  },
  {
    href: '/painel-loja/registos-caixa',
    label: 'Bloquear / desbloquear registos',
    icon: Lock,
    permission: 'store:lock_unlock_registers',
  },
  {
    href: '/painel-loja/relatorios-loja',
    label: 'Relatórios da loja',
    icon: FileWarning,
    permission: 'store:store_reports',
  },
];

type PainelLojaSidebarProps = {
  onNavigate?: () => void;
};

export function PainelLojaSidebar({ onNavigate }: PainelLojaSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [pendingQuoteRequests, setPendingQuoteRequests] = useState(0);

  useEffect(() => {
    if (!hasPermission(role, 'site:client_quote_requests')) return;
    /** Contador de pendentes na página `/painel-loja/area` (menu lateral compacto). */
    if (isGerenteSiteRole(role)) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/quote-requests?page=1&limit=1&status=pending');
        if (!res.ok) return;
        const data = await res.json();
        const total = data?.pagination?.total;
        if (!cancelled && typeof total === 'number') setPendingQuoteRequests(total);
      } catch {
        /* ignore */
      }
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  const nav = () => onNavigate?.();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Sessão terminada');
      router.push('/');
    } catch {
      toast.error('Erro ao sair');
    }
  };

  const visibleGerente = gerenteItems.filter(
    (it) => !it.permission || hasPermission(role, it.permission)
  );

  /** Gerente site: funções repetidas passam para `/painel-loja/area` — liberta o menu. */
  const gerenteSiteCompactNav = isGerenteSiteRole(role);

  const baseItems = baseItemsAll
    .filter((it) => it.href !== '/equipa/telegram' || canUseStaffTelegramBot(role))
    .filter((it) => {
      if (!gerenteSiteCompactNav) return true;
      return it.href === '/painel-loja' || it.href === '/loja';
    });

  return (
    <aside className="flex w-64 min-h-screen flex-col bg-slate-900 p-4 text-white">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-emerald-400">Painel da loja</h2>
        <p className="text-sm text-slate-400">MACOFEL — equipe de caixa</p>
      </div>

      <nav className="flex flex-1 flex-col space-y-1">
        {isGerenteSiteRole(role) && (
          <Link
            href="/painel-loja/area"
            onClick={nav}
            className={cn(
              'mb-2 flex items-center gap-3 rounded-lg border border-violet-500/45 bg-violet-950/50 px-4 py-3 text-sm font-semibold transition-colors',
              pathname?.startsWith('/painel-loja/area')
                ? 'border-violet-400 bg-violet-500 text-white'
                : 'text-violet-100 hover:bg-violet-950/80'
            )}
          >
            <Globe2 className="h-5 w-5 shrink-0" />
            Gerente site
          </Link>
        )}

        {baseItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/painel-loja'
              ? pathname === '/painel-loja'
              : pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={nav}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}

        {canOpenPainelLoja(role) && !gerenteSiteCompactNav && (
          <div className="pt-4">
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
              Orçamentos
            </p>
            <div className="space-y-1">
              {orcamentoItems
                .filter((it) => !it.permission || hasPermission(role, it.permission))
                .map(({ href, label, icon: Icon }) => {
                const active =
                  href === '/painel-loja/orcamentos'
                    ? pathname === href || pathname?.startsWith('/painel-loja/orcamentos/')
                    : href === '/painel-loja/solicitacoes-orcamento'
                      ? pathname === href ||
                        pathname?.startsWith('/painel-loja/solicitacoes-orcamento/')
                      : pathname === href;
                const showPendingBadge =
                  href === '/painel-loja/solicitacoes-orcamento' && pendingQuoteRequests > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={nav}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {showPendingBadge ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                          active ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'
                        )}
                        title="Solicitações pendentes de análise"
                      >
                        {pendingQuoteRequests > 99 ? '99+' : pendingQuoteRequests}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {canOpenPainelLoja(role) &&
          !gerenteSiteCompactNav &&
          isPainelLojaGerenteScopeRole(role) &&
          visibleGerente.length > 0 && (
          <div className="pt-4">
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
              Gestão (gerente)
            </p>
            <div className="space-y-1">
              {visibleGerente.map(({ href, label, icon: Icon }) => {
                const active =
                  href === '/painel-loja/estoque/alertas'
                    ? pathname?.startsWith('/painel-loja/estoque')
                    : pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={nav}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      active ? 'bg-amber-600 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-2 border-t border-slate-700 pt-4">
        <Link
          href="/"
          onClick={nav}
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800"
        >
          <Home className="h-5 w-5" />
          Site
        </Link>
        <button
          type="button"
          onClick={() => {
            nav();
            void handleLogout();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
