'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Home,
  Image as ImageIcon,
  LogOut,
  FileText,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/solicitacoes-orcamento', label: 'Solicitações de orçamento', icon: ClipboardList },
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
    if (session && (session.user as any)?.role !== 'ADMIN') {
      router.push('/admin/login');
    }
  }, [session, router]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if ((session?.user as any)?.role !== 'ADMIN') return;

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

        {/* Orçamento (mesma seção) */}
        <details
          className="px-1"
          open={pathname?.startsWith('/admin/orcamento') || pathname?.startsWith('/admin/orcamentos')}
        >
          <summary className="cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors list-none text-gray-300 hover:bg-gray-800">
            <FileText className="h-5 w-5" />
            <span>Orçamento</span>
          </summary>
          <div className="pl-6 space-y-1 pb-1">
            <Link
              href="/admin/orcamento"
              onClick={nav}
              className={cn(
                'block px-2 py-2 rounded-lg transition-colors text-sm',
                pathname?.startsWith('/admin/orcamento')
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              Orçamento
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
