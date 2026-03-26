'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowLeftRight, FileUp, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseHref = '/admin/estoque' as const;

const items = [
  { slug: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { slug: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { slug: 'importacao', label: 'Importação', icon: FileUp },
  { slug: 'relatorios', label: 'Relatórios', icon: LineChart },
] as const;

type StockSubnavProps = {
  className?: string;
};

export default function StockSubnav({ className }: StockSubnavProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'mb-6 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/85 via-slate-900 to-slate-900 p-4 text-white shadow-lg',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Admin • Estoque
        </span>
        <p className="text-sm text-slate-400">
          Módulo de estoque — não substitui a sincronização do PDV.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {items.map(({ slug, label, icon: Icon }) => {
          const href = `${baseHref}/${slug}` as const;
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={slug}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
