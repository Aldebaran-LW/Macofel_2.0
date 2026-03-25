'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  ScrollText,
  Download,
  KeyRound,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/master/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/admin/master/equipe', label: 'Equipe & roles', icon: Users },
  { href: '/admin/master/configuracoes', label: 'Configurações globais', icon: Settings },
  { href: '/admin/master/auditoria', label: 'Auditoria', icon: ScrollText },
  { href: '/admin/master/exportacao', label: 'Exportação', icon: Download },
  { href: '/admin/master/pdv-desktop', label: 'PDV Desktop', icon: Monitor },
  { href: '/admin/master/senhas', label: 'Senhas', icon: KeyRound },
];

export default function MasterAdminSubnav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-gray-900 to-gray-900 p-4 text-white shadow-lg">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Master Admin
        </span>
        <p className="text-sm text-gray-400">
          Área exclusiva — não visível para administradores comuns.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin/master/dashboard' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
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
