'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  User, 
  Package, 
  MapPin, 
  Heart, 
  Settings,
  Home,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/minha-conta', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/minha-conta/perfil', label: 'Meu Perfil', icon: User },
  { href: '/minha-conta/pedidos', label: 'Meus Pedidos', icon: Package },
  { href: '/minha-conta/enderecos', label: 'Endereços', icon: MapPin },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/minha-conta/configuracoes', label: 'Configurações', icon: Settings },
];

type ClientSidebarProps = {
  onNavigate?: () => void;
};

export default function ClientSidebar({ onNavigate }: ClientSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

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
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Minha Conta</h2>
        <p className="text-sm text-gray-500">MACOFEL</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/minha-conta' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={nav}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-gray-200 pt-4">
        <Link
          href="/"
          onClick={nav}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Home className="h-5 w-5" />
          <span className="font-medium">Voltar ao Site</span>
        </Link>
        <button
          onClick={() => {
            nav();
            void handleLogout();
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
