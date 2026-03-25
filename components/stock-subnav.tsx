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

  return (
    <div
      className={cn(
        'mb-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm',
        className
      )}
    >
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
                active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

