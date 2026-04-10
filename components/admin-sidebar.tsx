'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  FolderTree,
  ShoppingBag,
  Users,
  Home,
  Image as ImageIcon,
  LogOut,
  FileText,
  Sparkles,
  ClipboardList,
  Crown,
  UserCog,
  Shield,
  Monitor,
  Download,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { hasPdvFullWebAccess, isAdminDashboardRole, isMasterAdminRole } from '@/lib/permissions';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
];

type HeroSlideSide = { id: string; title?: string | null; subtitle?: string | null; active?: boolean };

type AdminSidebarProps = {
  /** Fecha o menu retrátil ao clicar em um link (mobile) */
  onNavigate?: () => void;
};

export default function AdminSidebar({ onNavigate }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [heroSlides, setHeroSlides] = useState<HeroSlideSide[]>([]);
  const [loadingHeroSlides, setLoadingHeroSlides] = useState(false);

  useEffect(() => {
    // Verificar se o usuário é admin
    if (session && !isAdminDashboardRole((session.user as any)?.role)) {
      router.push('/admin/login');
    }
  }, [session, router]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isAdminDashboardRole((session?.user as any)?.role)) return;

      try {
        setLoadingHeroSlides(true);
        const res = await fetch('/api/admin/hero-slides');
        if (!res.ok) throw new Error('Falha ao carregar slides');
        const data = await res.json();
        const list: HeroSlideSide[] = Array.isArray(data)
          ? data
              .map((s: any) => ({
                id: String(s.id ?? s._id ?? ''),
                title: s.title ?? null,
                subtitle: s.subtitle ?? null,
                active: typeof s.active === 'boolean' ? s.active : undefined,
              }))
              .filter((s) => s.id)
          : [];
        if (!cancelled) setHeroSlides(list);
      } catch (e) {
        if (!cancelled) setHeroSlides([]);
      } finally {
        if (!cancelled) setLoadingHeroSlides(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso');
      router.push('/');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const nav = () => onNavigate?.();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-red-500">Painel Admin</h2>
        <p className="text-sm text-gray-400">MACOFEL</p>
      </div>

      <nav className="flex-1 space-y-2">
        {isMasterAdminRole((session?.user as any)?.role) && (
          <Link
            href="/admin/master/dashboard"
            onClick={nav}
            className={cn(
              'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors border border-amber-600/50 bg-amber-950/40',
              pathname?.startsWith('/admin/master')
                ? 'bg-amber-600 text-gray-950 border-amber-500'
                : 'text-amber-200 hover:bg-amber-950/70'
            )}
          >
            <Crown className="h-5 w-5 shrink-0" />
            <span className="font-semibold">Área Master</span>
          </Link>
        )}

        {!isMasterAdminRole((session?.user as any)?.role) && (
          <Link
            href="/admin/area"
            onClick={nav}
            className={cn(
              'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors border border-emerald-600/40 bg-emerald-950/40',
              pathname?.startsWith('/admin/area')
                ? 'bg-emerald-500 text-gray-950 border-emerald-400'
                : 'text-emerald-200 hover:bg-emerald-950/70'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="font-semibold">Admin</span>
          </Link>
        )}

        {hasPdvFullWebAccess((session?.user as any)?.role) && (
          <Link
            href="/loja"
            onClick={nav}
            className={cn(
              'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors border border-sky-600/40 bg-sky-950/40',
              pathname?.startsWith('/loja')
                ? 'bg-sky-500 text-gray-950 border-sky-400'
                : 'text-sky-200 hover:bg-sky-950/70'
            )}
          >
            <Monitor className="h-5 w-5 shrink-0" />
            <span className="font-semibold">PDV (/loja)</span>
          </Link>
        )}

        <Link
          href="/admin/pdv-desktop"
          onClick={nav}
          className={cn(
            'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors border border-emerald-700/35 bg-emerald-950/30',
            pathname === '/admin/pdv-desktop'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'text-emerald-100 hover:bg-emerald-950/60'
          )}
        >
          <Download className="h-5 w-5 shrink-0" />
          <span className="font-semibold">PDV Desktop</span>
        </Link>

        <Link
          href="/admin/telegram"
          onClick={nav}
          className={cn(
            'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors border border-sky-700/35 bg-sky-950/25',
            pathname === '/admin/telegram'
              ? 'bg-sky-600 text-white border-sky-500'
              : 'text-sky-100 hover:bg-sky-950/55'
          )}
        >
          <Bot className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Telegram</span>
        </Link>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={nav}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Orçamento: montagem interna, histórico e pedidos dos clientes */}
        <details
          className="px-1"
          open={
            pathname === '/admin/orcamento' ||
            pathname?.startsWith('/admin/orcamentos') ||
            pathname?.startsWith('/admin/solicitacoes-orcamento')
          }
        >
          <summary
            className={cn(
              'cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors list-none hover:bg-gray-800',
              pathname === '/admin/orcamento' ||
                pathname?.startsWith('/admin/orcamentos') ||
                pathname?.startsWith('/admin/solicitacoes-orcamento')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300'
            )}
          >
            <FileText className="h-5 w-5" />
            <span>Orçamento</span>
          </summary>
          <div className="pl-6 space-y-1 pb-1">
            <Link
              href="/admin/solicitacoes-orcamento"
              onClick={nav}
              className={cn(
                'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm',
                pathname?.startsWith('/admin/solicitacoes-orcamento')
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              Solicitações dos clientes
            </Link>
            <Link
              href="/admin/orcamento"
              onClick={nav}
              className={cn(
                'block px-2 py-2 rounded-lg transition-colors text-sm',
                pathname === '/admin/orcamento'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              Montar orçamento
            </Link>
            <Link
              href="/admin/orcamentos"
              onClick={nav}
              className={cn(
                'block px-2 py-2 rounded-lg transition-colors text-sm',
                pathname?.startsWith('/admin/orcamentos')
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              Orçamentos salvos
            </Link>
          </div>
        </details>

        {/* Categorias (exibe existentes) */}
        <details className="px-1" open={pathname?.startsWith('/admin/categorias')}>
          <summary className="cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors list-none text-gray-300 hover:bg-gray-800">
            <FolderTree className="h-5 w-5" />
            <span>Categorias</span>
          </summary>
          <div className="pl-6 space-y-1 pb-1">
            <Link
              href="/admin/categorias"
              onClick={nav}
              className={cn(
                'block px-2 py-2 rounded-lg transition-colors text-sm',
                pathname?.startsWith('/admin/categorias') ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              Gerenciar categorias
            </Link>
          </div>
        </details>

        {/* Imagens Hero (exibe existentes para config) */}
        <details className="px-1" open={pathname?.startsWith('/admin/hero-images')}>
          <summary className="cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors list-none text-gray-300 hover:bg-gray-800">
            <ImageIcon className="h-5 w-5" />
            <span>Imagens Hero</span>
          </summary>
          <div className="pl-6 space-y-1 pb-1">
            <Link
              href="/admin/hero-images"
              onClick={nav}
              className={cn(
                'block px-2 py-2 rounded-lg transition-colors text-sm',
                pathname?.startsWith('/admin/hero-images') ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              Gerenciar slides
            </Link>
            {loadingHeroSlides ? (
              <div className="text-xs text-gray-400 px-2 py-2">Carregando...</div>
            ) : (
              heroSlides
                .slice()
                .sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1))
                .map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/hero-images?edit=${encodeURIComponent(s.id)}`}
                    onClick={nav}
                    className="block px-2 py-2 rounded-lg transition-colors text-sm text-gray-300 hover:bg-gray-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      {s.active ? <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> : null}
                      {s.title || s.subtitle || 'Slide'}
                    </span>
                  </Link>
                ))
            )}
          </div>
        </details>
      </nav>

      <div className="space-y-2 border-t border-gray-700 pt-4">
        <Link
          href="/"
          onClick={nav}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Voltar ao Site</span>
        </Link>
        <button
          onClick={() => {
            nav();
            void handleLogout();
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
