'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Users, Home, Image as ImageIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useEffect } from 'react';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/hero-images', label: 'Imagens Hero', icon: ImageIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    // Verificar se o usuário é admin
    if (session && (session.user as any)?.role !== 'ADMIN') {
      router.push('/admin/login');
    }
  }, [session, router]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso');
      router.push('/');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

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
      </nav>

      <div className="space-y-2 border-t border-gray-700 pt-4">
        <Link
          href="/"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Voltar ao Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
