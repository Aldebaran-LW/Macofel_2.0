'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowLeftRight, FileUp, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

type StockSubnavProps = {
  baseHref: '/admin/estoque' | '/admin/master/estoque';
  className?: string;
};

const items = [
  { slug: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { slug: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { slug: 'importacao', label: 'Importação', icon: FileUp },
  { slug: 'relatorios', label: 'Relatórios', icon: LineChart },
] as const;

export default function StockSubnav({ baseHref, className }: StockSubnavProps) {
  const pathname = usePathname();

  const isMaster = baseHref.startsWith('/admin/master');
  const title = isMaster ? 'Master Admin' : 'Admin';
  const subtitle = isMaster
    ? 'Área exclusiva — não visível para administradores comuns.'
    : 'Módulo de estoque — não substitui a sincronização do PDV.';

  return (
    <div
      className={cn(
        'mb-6 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-gray-900 to-gray-900 p-4 text-white shadow-lg',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          {title} • Estoque
        </span>
        <p className="text-sm text-gray-400">{subtitle}</p>
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
                  ? 'bg-amber-500 text-gray-950'
                  : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700'
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

